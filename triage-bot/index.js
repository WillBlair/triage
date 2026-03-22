/**
 * index.js — Discord-specific entry point for Triage.
 * All platform logic lives here. handler.js, prompt.js, checklist.js,
 * and logger.js are platform-agnostic and can be reused for Telegram.
 */

import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  Events,
} from "discord.js";

import {
  startCheckin,
  handleSymptomSelection,
  handleFreeText,
  finalizeSession,
  getSessionStage,
} from "./handler.js";
import { STILL_THERE_MESSAGE, DOCTOR_TRANSFER_MESSAGE } from "./prompt.js";

// Two-stage inactivity: 2.5 min → "still there?" prompt; 2.5 min more → auto-close.
const WARN_MS  = 2.5 * 60 * 1000;
const CLOSE_MS = 2.5 * 60 * 1000;

// Per-user timer handles: Map<userId, { warnHandle, closeHandle }>
const inactivityTimers = new Map();

// Button custom IDs
const BTN_DONE     = "triage_done";
const BTN_CONTINUE = "triage_continue";
const BTN_DOCTOR   = "triage_doctor";

/** Builds the three-button action row shown after every Claude reply. */
function buildActionRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(BTN_DONE).setLabel("I'm done ✓").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(BTN_CONTINUE).setLabel("Keep chatting 💬").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(BTN_DOCTOR).setLabel("Connect to my doctor 🩺").setStyle(ButtonStyle.Secondary),
  );
}
import { supabase } from "./supabase.js";
import { startRealtimeListener } from "./realtime.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
});

// ---------------------------------------------------------------------------
// Ready
// ---------------------------------------------------------------------------

client.once(Events.ClientReady, (c) => {
  console.log(`Triage is online as ${c.user.tag}`);

  if (supabase) {
    const testingMode = process.env.TESTING_MODE === "true";
    startRealtimeListener({
      supabase,
      onMatch: ({ discordUserId, prescriptionId, medicationName }) =>
        triggerCheckinDM({ discordUserId, prescriptionId, medicationName }),
      testingMode,
    });
  } else {
    console.warn("[Triage] Supabase not configured — Realtime listener inactive.");
  }
});

client.on(Events.Error, (err) => {
  console.error("Discord client error:", err);
});

// ---------------------------------------------------------------------------
// Slash commands
// ---------------------------------------------------------------------------

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // /checkin command
    if (interaction.isChatInputCommand() && interaction.commandName === "checkin") {
      await handleCheckinCommand(interaction);
      return;
    }

    // Symptom select menu
    if (interaction.isStringSelectMenu() && interaction.customId === "symptom_select") {
      await handleSymptomMenu(interaction);
      return;
    }

    // Action buttons (done / continue / doctor)
    if (interaction.isButton() && [BTN_DONE, BTN_CONTINUE, BTN_DOCTOR].includes(interaction.customId)) {
      await handleActionButton(interaction);
      return;
    }
  } catch (err) {
    console.error("Interaction error:", err);
    try {
      const payload = { content: "Something went wrong. Please try /checkin again.", flags: MessageFlags.Ephemeral };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload);
      } else {
        await interaction.reply(payload);
      }
    } catch {
      // Interaction already expired — nothing to do
    }
  }
});

// ---------------------------------------------------------------------------
// Direct messages (plain text follow-up during freetext stage)
// ---------------------------------------------------------------------------

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  // Only handle DMs for the free-text stage
  if (message.channel.type !== 1 /* DMChannel */) return;

  const userId = message.author.id;
  const stage = getSessionStage(userId);
  if (stage !== "freetext") return;

  await message.channel.sendTyping();

  try {
    const result = await handleFreeText(userId, message.content);

    // Claude's contextual response
    await message.reply(result.claudeResponse);

    // Emergency flag
    if (result.emergencyFlag && result.emergencyMessage) {
      await message.channel.send(result.emergencyMessage);
    }

    // Action buttons — let the patient choose what to do next
    await message.channel.send({ content: "What would you like to do next?", components: [buildActionRow()] });

    // Reset the two-stage inactivity timer
    resetInactivityTimer(userId, message.content, message.channel);
  } catch (err) {
    console.error("Error in free-text handler:", err);
    await message.reply(
      "I'm sorry, something went wrong on my end. Please try again or contact your care team directly."
    );
  }
});

// ---------------------------------------------------------------------------
// Inactivity timer (two-stage)
// ---------------------------------------------------------------------------

/** Clears both timer handles for a user. */
function clearTimers(userId) {
  const t = inactivityTimers.get(userId);
  if (t) {
    if (t.warnHandle)  clearTimeout(t.warnHandle);
    if (t.closeHandle) clearTimeout(t.closeHandle);
    inactivityTimers.delete(userId);
  }
}

/**
 * Resets the two-stage inactivity timer:
 *   Stage 1 (WARN_MS):  sends "Are you still there?" with action buttons.
 *   Stage 2 (CLOSE_MS): auto-closes the session if still no response.
 */
function resetInactivityTimer(userId, lastFreeText, channel) {
  clearTimers(userId);

  const warnHandle = setTimeout(async () => {
    // Update stored entry to only have the close handle
    const closeHandle = setTimeout(async () => {
      inactivityTimers.delete(userId);
      try {
        const { closing } = await finalizeSession(userId, lastFreeText);
        await channel.send(closing);
        console.log(`[Triage] Session auto-closed for ${userId} after inactivity.`);
      } catch (err) {
        console.error(`[Triage] Error auto-closing session for ${userId}:`, err.message);
      }
    }, CLOSE_MS);

    inactivityTimers.set(userId, { warnHandle: null, closeHandle });

    try {
      await channel.send({ content: STILL_THERE_MESSAGE, components: [buildActionRow()] });
    } catch (err) {
      console.error(`[Triage] Error sending still-there prompt to ${userId}:`, err.message);
    }
  }, WARN_MS);

  inactivityTimers.set(userId, { warnHandle, closeHandle: null });
}

// ---------------------------------------------------------------------------
// Button handler
// ---------------------------------------------------------------------------

async function handleActionButton(interaction) {
  const userId = interaction.user.id;

  // Disable the buttons on the message so they can't be clicked again
  const disabledRow = ActionRowBuilder.from(interaction.message.components[0]);
  disabledRow.components.forEach((btn) => btn.setDisabled(true));
  await interaction.update({ components: [disabledRow] });

  const dm = interaction.channel ?? await interaction.user.createDM();

  if (interaction.customId === BTN_DONE) {
    clearTimers(userId);
    const { closing } = await finalizeSession(userId);
    await dm.send(closing);
    console.log(`[Triage] Session closed by ${userId} via "I'm done" button.`);

  } else if (interaction.customId === BTN_CONTINUE) {
    resetInactivityTimer(userId, "", dm);
    await dm.send("Take your time! 😊 Feel free to share anything else that's on your mind.");

  } else if (interaction.customId === BTN_DOCTOR) {
    clearTimers(userId);
    await finalizeSession(userId);
    await dm.send(DOCTOR_TRANSFER_MESSAGE);
    console.log(`[Triage] Session closed by ${userId} via "Connect to doctor" button.`);
  }
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function handleCheckinCommand(interaction) {
  const patientName = interaction.user.globalName ?? interaction.user.username;
  const { greeting, symptoms } = startCheckin(interaction.user.id, null, patientName);

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("symptom_select")
    .setPlaceholder("Select all symptoms that apply...")
    .setMinValues(1)
    .setMaxValues(symptoms.length)
    .addOptions(
      symptoms.map((s) =>
        new StringSelectMenuOptionBuilder().setLabel(s.label).setValue(s.value)
      )
    );

  const row = new ActionRowBuilder().addComponents(selectMenu);

  await interaction.reply({
    content: greeting,
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}

async function handleSymptomMenu(interaction) {
  const selected = interaction.values;
  const { followup } = handleSymptomSelection(interaction.user.id, selected);

  // Disable the select menu so it can't be re-submitted
  const disabledRow = ActionRowBuilder.from(interaction.message.components[0]);
  disabledRow.components[0].setDisabled(true);

  await interaction.update({ components: [disabledRow] });

  // Send follow-up prompt as a DM so the free-text reply is in DMs
  try {
    const dm = await interaction.user.createDM();
    await dm.send(followup);
  } catch {
    // Fallback: reply in-channel if DMs are closed
    await interaction.followUp({
      content: followup,
      flags: MessageFlags.Ephemeral,
    });
  }
}

// ---------------------------------------------------------------------------
// Realtime-triggered DM check-in
// ---------------------------------------------------------------------------

/**
 * Sends the Triage greeting + symptom select menu directly to a patient's DMs.
 * Called by the Supabase Realtime listener when a new prescription is detected.
 */
async function triggerCheckinDM({ discordUserId, prescriptionId, medicationName }) {
  try {
    const user = await client.users.fetch(discordUserId);
    const dm = await user.createDM();

    const patientName = user.globalName ?? user.username;
    const { greeting, symptoms } = startCheckin(discordUserId, prescriptionId, patientName);

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("symptom_select")
      .setPlaceholder("Select all symptoms that apply...")
      .setMinValues(1)
      .setMaxValues(symptoms.length)
      .addOptions(
        symptoms.map((s) =>
          new StringSelectMenuOptionBuilder().setLabel(s.label).setValue(s.value)
        )
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const intro = medicationName
      ? `${greeting}\n\nThis check-in is regarding your recent prescription: **${medicationName}**.`
      : greeting;

    await dm.send({ content: intro, components: [row] });
    console.log(`[Triage] Check-in DM sent to ${discordUserId} (prescription: ${prescriptionId})`);
  } catch (err) {
    console.error(
      `[Triage] Failed to send check-in DM to ${discordUserId}:`,
      err.message
    );
  }
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

client.login(process.env.DISCORD_TOKEN);

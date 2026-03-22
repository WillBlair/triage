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
  MessageFlags,
  Events,
} from "discord.js";

import {
  startCheckin,
  handleSymptomSelection,
  handleFreeText,
  getSessionStage,
} from "./handler.js";
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
    if (
      interaction.isChatInputCommand() &&
      interaction.commandName === "checkin"
    ) {
      await handleCheckinCommand(interaction);
      return;
    }

    // Symptom select menu
    if (
      interaction.isStringSelectMenu() &&
      interaction.customId === "symptom_select"
    ) {
      await handleSymptomMenu(interaction);
      return;
    }
  } catch (err) {
    console.error("Interaction error:", err);
    // Attempt to inform the user if the interaction is still valid
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

  const stage = getSessionStage(message.author.id);
  if (stage !== "freetext") return;

  await message.channel.sendTyping();

  try {
    const result = await handleFreeText(message.author.id, message.content);

    // Claude's contextual response
    await message.reply(result.claudeResponse);

    // Emergency flag
    if (result.emergencyFlag && result.emergencyMessage) {
      await message.channel.send(result.emergencyMessage);
    }

    // Closing
    await message.channel.send(result.closing);
  } catch (err) {
    console.error("Error in free-text handler:", err);
    await message.reply(
      "I'm sorry, something went wrong on my end. Please try again or contact your care team directly."
    );
  }
});

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function handleCheckinCommand(interaction) {
  const { greeting, symptoms } = startCheckin(interaction.user.id);

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

    const { greeting, symptoms } = startCheckin(discordUserId, prescriptionId);

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

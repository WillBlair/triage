/**
 * register-commands.js — Registers slash commands with the Discord API.
 * Run once with: node register-commands.js
 */

import "dotenv/config";
import { REST, Routes, SlashCommandBuilder } from "discord.js";

const commands = [
  new SlashCommandBuilder()
    .setName("checkin")
    .setDescription(
      "Start a post-appointment check-in with Triage"
    )
    .toJSON(),
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("Registering slash commands...");
    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands }
    );
    console.log("Slash commands registered successfully.");
  } catch (err) {
    console.error("Failed to register commands:", err);
    process.exit(1);
  }
})();

import { REST } from "@discordjs/rest";
import { Routes } from "discord.js";
import type { Collection } from "@discordjs/collection";
import type { Command } from "./types/global";
import { config } from "./config";

export async function deployCommands(
  commands: Collection<string, Command>,
  guildId: string = config.discord.guildId, 
): Promise<void> {
  const payload = Array.from(commands.values(), c => c.data.toJSON());
  if (payload.length === 0) {
    console.log("ℹ️ No commands to deploy.");
    return;
  }

  const { token, clientId } = config.discord;
  if (!token || !clientId || !guildId) {
    throw new Error("Missing discord token/clientId/guildId.");
  }

  const rest = new REST({ version: "10" }).setToken(token);

  console.log(`🔄 Deploying ${payload.length} slash commands to guild ${guildId}...`);
  try {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: payload });
    console.log("✅ Commands deployed successfully");
  } catch (error: any) {
    const detail = error?.rawError ? JSON.stringify(error.rawError) : String(error);
    console.error("❌ Failed to deploy commands:", detail);
    throw error; 
  }
}
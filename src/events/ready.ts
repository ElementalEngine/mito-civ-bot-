import { Events } from 'discord.js';
import type { Client } from 'discord.js';
import { deployCommands } from '../deploy.js';

export const name = Events.ClientReady;
export const once = true;

export async function execute(client: Client): Promise<void> {
  console.log(`🟢 ${client.user?.tag} is online and ready!`);
  // Deploy all slash commands on startup
  await deployCommands(client.commands);
}

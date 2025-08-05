import { Client, Collection, Events, GatewayIntentBits } from 'discord.js';
import { readdir } from 'fs/promises';
import path from 'path';
import type { Command } from './types/global';


const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
  ],
});

client.commands = new Collection<string, Command>();

// Load commands dynamically
(async () => {
  const commandsPath = path.join(__dirname, '../commands');
  for (const dirent of await readdir(commandsPath, { withFileTypes: true })) {
    if (!dirent.isDirectory()) continue;
    const subdir = path.join(commandsPath, dirent.name);
    for (const file of await readdir(subdir)) {
      if (!file.endsWith('.ts') && !file.endsWith('.js')) continue;
      const { data, execute } = await import(path.join(subdir, file));
      client.commands.set(data.name, { data, execute });
    }
  }
})();

// Load events dynamically
(async () => {
  const eventsPath = path.join(__dirname, 'events');
  for (const file of await readdir(eventsPath)) {
    if (!file.endsWith('.ts') && !file.endsWith('.js')) continue;
    const { name, once, execute } = await import(path.join(eventsPath, file));
    if (once) client.once(name, execute);
    else client.on(name, execute);
  }
})();

// Log ready
client.once(Events.ClientReady, () => {
  console.log(`🟢 Logged in as ${client.user?.tag}`);
});

export default client;
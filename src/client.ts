import { Client, Collection, GatewayIntentBits, Events } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { deployCommands } from './deploy';
// import type { Command } from './types/discord';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    // add any additional intents here e.g., MessageContent
  ],
  // partials: ['MESSAGE', 'CHANNEL', 'REACTION'], // enable if needed
});

// Attach a collection for commands
client.commands = new Collection<string, Command>();

// Dynamically load command modules using type-safe import()
(async () => {
  const commandsRoot = path.resolve(__dirname, './commands');
  for (const dirent of fs.readdirSync(commandsRoot, { withFileTypes: true })) {
    const dirPath = path.join(commandsRoot, dirent.name);
    if (!dirent.isDirectory()) continue;
    const files = fs.readdirSync(dirPath).filter(file => /\.(ts|js)$/.test(file));
    for (const file of files) {
      const mod = await import(path.join(dirPath, file)) as { data: Command['data']; execute: Command['execute'] };
      if (mod.data?.name && typeof mod.execute === 'function') {
        client.commands.set(mod.data.name, { data: mod.data, execute: mod.execute });
      }
    }
  }
})();

// Event: ready
client.once(Events.ClientReady, async c => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
  await deployCommands();
});

// Event: interactionCreate
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`Error in command ${interaction.commandName}`, err);
    await interaction.reply({ content: 'There was an error executing that command.', ephemeral: true });
  }
});

export default client;
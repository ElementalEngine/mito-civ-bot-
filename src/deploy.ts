import { REST } from '@discordjs/rest';
import { Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';
// import { config } from './config';

// Collect all slash command JSON payloads
const commands: any[] = [];
const commandsPath = path.resolve(__dirname, './commands');
const categories = fs.readdirSync(commandsPath, { withFileTypes: true });

for (const category of categories) {
  const categoryPath = path.join(commandsPath, category.name);
  if (category.isDirectory()) {
    const files = fs.readdirSync(categoryPath).filter(f => /\.(ts|js)$/.test(f));
    for (const file of files) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { data } = require(path.join(categoryPath, file));
      if (data?.toJSON) commands.push(data.toJSON());
    }
  }
}

const rest = new REST({ version: '10' }).setToken(config.discord.token);

export async function deployCommands(): Promise<void> {
  console.log(`Deploying ${commands.length} slash commands...`);
  try {
    await rest.put(
      Routes.applicationGuildCommands(
        config.discord.clientId,
        config.discord.guildId
      ),
      { body: commands }
    );
    console.log('✅ Commands deployed successfully');
  } catch (err) {
    console.error('❌ Failed to deploy commands', err);
  }
}
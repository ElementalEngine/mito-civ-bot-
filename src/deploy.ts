import { REST } from '@discordjs/rest';
import { Routes } from 'discord.js';
import type { Command } from './types/global';
import { config } from './config';
import type { Collection } from '@discordjs/collection';

export async function deployCommands(
  commands: Collection<string, Command>
): Promise<void> {
  const payload = Array.from(commands.values(), cmd => cmd.data.toJSON());
  const rest = new REST({ version: '10' }).setToken(config.discord.token);

  try {
    console.log(`🔄 Deploying ${payload.length} slash commands...`);
    await rest.put(
      Routes.applicationGuildCommands(
        config.discord.clientId,
        config.discord.guildId
      ),
      { body: payload }
    );
    console.log('✅ Commands deployed to server successfully');
  } catch (error) {
    console.error('❌ Failed to deploy commands to server:', error);
  }
}
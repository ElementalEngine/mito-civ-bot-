import { Collection, SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

/**
 * Standard shape for a slash-command module.
 */
export interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

/**
 * Augment the discord.js Client to include a commands collection.
 */
declare module 'discord.js' {
  interface Client {
    commands: Collection<string, Command>;
  }
}
import { Events, Interaction, ChatInputCommandInteraction, InteractionReplyOptions } from 'discord.js';
import type { Collection } from '@discordjs/collection';

type BotClientWithCommands = import('discord.js').Client & { commands: Collection<string, any> };
type NewInteraction = ChatInputCommandInteraction & { client: BotClientWithCommands };

export const name = Events.InteractionCreate;
export const once = false;

export async function execute(interaction: Interaction): Promise<void> {
  if (!interaction.isChatInputCommand()) return;
  const cmdInteraction = interaction as NewInteraction;

  // Acknowledge to avoid 3s timeout
  await cmdInteraction.deferReply({ ephemeral: true });

  const command = cmdInteraction.client.commands.get(cmdInteraction.commandName);
  if (!command) {
    console.warn(`No matching command for: ${cmdInteraction.commandName}`);
    return;
  }

  try {
    await command.execute(cmdInteraction);
  } catch (error) {
    console.error(`Error executing ${cmdInteraction.commandName}:`, error);
    const replyOptions: InteractionReplyOptions = {
      content: '❌ An unexpected error occurred.',
      ephemeral: true,
    };
    if (cmdInteraction.replied || cmdInteraction.deferred) {
      await cmdInteraction.followUp(replyOptions);
    } else {
      await cmdInteraction.reply(replyOptions);
    }
  }
}

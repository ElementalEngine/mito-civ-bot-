import {
  Events,
  Interaction,
  ChatInputCommandInteraction,
  InteractionReplyOptions,
  MessageFlags,
} from 'discord.js';
import type { Collection } from 'discord.js';
import type { Command } from '../types/global';

export const name = Events.InteractionCreate;
export const once = false;

type NewInteraction = Interaction & {
  client: Interaction['client'] & { commands: Collection<string, Command> };
};

export async function execute(interaction: NewInteraction): Promise<void> {
  if (!interaction.isChatInputCommand()) return;

  const i = interaction as ChatInputCommandInteraction;
  const command = i.client.commands.get(i.commandName);
  if (!command) {
    await i.reply({ content: '❌ Command not found.', flags: MessageFlags.Ephemeral });
    return;
  }

  try {
    await command.execute(i);
  } catch (err) {
    const fail: InteractionReplyOptions = {
      content: '❌ An unexpected error occurred.',
      flags: MessageFlags.Ephemeral, 
    };

    if (i.deferred) {
      await i.editReply({ content: fail.content });
    } else if (i.replied) {
      await i.followUp(fail); 
    } else {
      await i.reply(fail);   
    }

    console.error(`/${i.commandName} error:`, err);
  }
}
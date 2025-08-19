import { Collection, Events, Interaction, MessageFlags } from "discord.js";
import type { Command } from "../types/global";

export const name = Events.InteractionCreate;
export const once = false;

type WithCommands = Interaction["client"] & { commands: Collection<string, Command> };
type NewInteraction = Interaction & { client: WithCommands };

export const execute = async (interaction: NewInteraction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) {
    await interaction.reply({
      content: "❌ Command not found.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`/${interaction.commandName} error:`, error);

    const replyOpts = {
      content: "❌ There was an error while executing this command!",
      flags: MessageFlags.Ephemeral,
    } as const;
    const editOpts = {
      content: "❌ There was an error while executing this command!",
    } as const;

    try {
      if (interaction.deferred) {
        await interaction.editReply(editOpts);      
      } else if (interaction.replied) {
        await interaction.followUp(replyOpts);         
      } else {
        await interaction.reply(replyOpts);    
      }
    } catch {
      // last-resort if state changed mid-flight
      try { await interaction.followUp(replyOpts); } catch {}
    }
  }
};
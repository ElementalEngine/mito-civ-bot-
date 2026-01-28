import { Collection, Events, MessageFlags, type Interaction } from "discord.js";
import type { Command } from "../types/global.js";

export const name = Events.InteractionCreate;
export const once = false;

type WithCommands = Interaction["client"] & { commands: Collection<string, Command> };
type NewInteraction = Interaction & { client: WithCommands };

const seen = new Map<string, number>();
const TTL_MS = 2 * 60_000; 
let lastSweep = 0;

function markOnce(id: string): boolean {
  const now = Date.now();

  // small periodic sweep to avoid memory growth
  if (now - lastSweep > 30_000) {
    lastSweep = now;
    for (const [key, ts] of seen) {
      if (now - ts > TTL_MS) seen.delete(key);
    }
  }

  if (seen.has(id)) return false;
  seen.set(id, now);
  return true;
}

export const execute = async (interaction: NewInteraction) => {
  if (!interaction.isChatInputCommand()) return;

  // ✅ idempotent per interaction.id
  if (!markOnce(interaction.id)) return;

  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) {
    await interaction
      .reply({
        content: "❌ Command not found.",
        flags: MessageFlags.Ephemeral,
      })
      .catch(() => {});
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error: unknown) {
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
      await interaction.followUp(replyOpts).catch(() => {});
    }
  }
};

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import { config } from "../../config";
import { EMOJI_CONFIRM, EMOJI_FAIL, MAX_DISCORD_LEN } from "../../config/constants";
import { setPlacements } from "../../services/reporting.service";
import { chunkByLength } from "../../utils/chunk-by-length";
import { convertMatchToStr } from "../../utils/convert-match-to-str";

import type { BaseReport } from "../../types/reports";

export const data = new SlashCommandBuilder()
  .setName("change-report-order")
  .setDescription("Change the order of players in a game.")
  .addStringOption(option =>
    option.setName("match-id")
      .setDescription("ID of the match to change the order for")
      .setRequired(true),
  )
  .addStringOption(option =>
    option.setName("new-order")
      .setDescription("Order of players in the format 4 2 1 3 (space-separated player IDs)")
      .setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) {
    await interaction.reply({
      content: `${EMOJI_FAIL} This command must be used in a server.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const matchId = interaction.options.getString("match-id", true) as string;
  const newOrder = interaction.options.getString("new-order", true) as string;

  const errors: string[] = [];

  if (errors.length) {
    await interaction.reply({
      content: `${EMOJI_FAIL} FAIL\n${errors.map(e => `• ${e}`).join("\n")}`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const res = await setPlacements(matchId, newOrder);
    const header =
      `${EMOJI_CONFIRM} Match order changed by <@${interaction.user.id}> (${interaction.user.id})\n` +
      `Match ID: **${res.match_id}**\n`;

    await interaction.editReply("Match order changed successfully!");

    const full = header + convertMatchToStr(res as BaseReport);
    for (const chunk of chunkByLength(full, MAX_DISCORD_LEN)) {
      await interaction.followUp({ content: chunk }); 
    }
  } catch (err: any) {
    const msg = err?.body ? `${err.message}: ${JSON.stringify(err.body)}` : (err?.message ?? "Unknown error");
    await interaction.editReply(`${EMOJI_FAIL} Upload failed: ${msg}`);
  }
}
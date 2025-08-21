import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import { config } from "../../config";
import { EMOJI_CONFIRM, EMOJI_FAIL, MAX_DISCORD_LEN } from "../../config/constants";
import { triggerQuit, getMatch } from "../../services/reporting.service";
import { chunkByLength } from "../../utils/chunk-by-length";
import { convertMatchToStr } from "../../utils/convert-match-to-str";

import type { BaseReport } from "../../types/reports";

export const data = new SlashCommandBuilder()
  .setName("trigger-quit")
  .setDescription("Set/Unset a player to be marked for quit.")
  .addStringOption(option =>
    option.setName("match-id")
      .setDescription("ID of the match to change the quit for")
      .setRequired(true),
  )
  .addStringOption(option =>
    option.setName("quitter-discord-id")
      .setDescription("Discord ID of the player who quit")
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
  const quitterDiscordId = interaction.options.getString("quitter-discord-id", true) as string;

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
    if (!interaction.member.roles.cache.has(config.discord.roles.moderator)) {
      const getMatchRes = await getMatch(matchId);
      if (getMatchRes?.reporter_discord_id != interaction.user.id) {
        await interaction.editReply(`${EMOJI_FAIL} Only original reporter <@${getMatchRes?.reporter_discord_id}> or a moderator can report a quit`);
        return;
      }
    }
    const res = await triggerQuit(matchId, quitterDiscordId);
    const header =
      `${EMOJI_CONFIRM} Player <@${quitterDiscordId}> quit is triggered by <@${interaction.user.id}> (${interaction.user.id})\n` +
      `Match ID: **${res.match_id}**\n`;

    await interaction.editReply("Report is changed successfully to trigger quit!");

    const full = header + convertMatchToStr(res as BaseReport);
    for (const chunk of chunkByLength(full, MAX_DISCORD_LEN)) {
      await interaction.followUp({ content: chunk }); 
    }
  } catch (err: any) {
    const msg = err?.body ? `${err.message}: ${JSON.stringify(err.body)}` : (err?.message ?? "Unknown error");
    await interaction.editReply(`${EMOJI_FAIL} Upload failed: ${msg}`);
  }
}
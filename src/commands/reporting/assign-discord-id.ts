import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import { config } from "../../config";
import { EMOJI_CONFIRM, EMOJI_FAIL, MAX_DISCORD_LEN } from "../../config/constants";
import { assignDiscordId } from "../../services/reporting.service";
import { buildReportEmbed } from "../../ui/layout/report.layout";
import { chunkByLength } from "../../utils/chunk-by-length";
import { convertMatchToStr } from "../../utils/convert-match-to-str";

import type { BaseReport } from "../../types/reports";

export const data = new SlashCommandBuilder()
  .setName("assign-discord-id")
  .setDescription("Set a player's discord id.")
  .addStringOption(option =>
    option.setName("match-id")
      .setDescription("ID of the match to change discord id of a player")
      .setRequired(true),
  )
  .addStringOption(option =>
    option.setName("player-id")
      .setDescription("ID of the player in this match to assign")
      .setRequired(true),
  )
  .addStringOption(option =>
    option.setName("discord-id")
      .setDescription("Discord ID of the player")
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
  const playerId = interaction.options.getString("player-id", true) as string;
  const discordId = interaction.options.getString("discord-id", true) as string;

  const errors: string[] = [];

  if (errors.length) {
    await interaction.reply({
      content: `${EMOJI_FAIL} FAIL\n${errors.map(e => `• ${e}`).join("\n")}`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply();

  try {
    if (!interaction.member.roles.cache.has(config.discord.roles.moderator)) {
      await interaction.editReply(`${EMOJI_FAIL} Only a moderator can assign a player discord id.`);
      return;
    }
    const res = await assignDiscordId(matchId, playerId, discordId);

    const header =
      `${EMOJI_CONFIRM} Discord ID assigned by <@${interaction.user.id}> (${interaction.user.id})\n` +
      `Match ID: **${res.match_id}**\n`;

    const full = header + convertMatchToStr(res as BaseReport);
    for (const chunk of chunkByLength(full, MAX_DISCORD_LEN)) {
      await interaction.followUp({ content: chunk }); 
    }

    const embed = buildReportEmbed(res, {
      reporterId: interaction.user.id,
    });

    await interaction.followUp({
      embeds: [embed],
    });
  } catch (err: any) {
    const msg = err?.body ? `${err.message}: ${JSON.stringify(err.body)}` : (err?.message ?? "Unknown error");
    await interaction.editReply(`${EMOJI_FAIL} Discord ID assignment failed: ${msg}`);
  }
}
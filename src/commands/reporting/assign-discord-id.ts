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
  const playerDiscordId = interaction.options.getString("discord-id", true) as string;

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
    const assignDiscordIdMsg = await interaction.editReply(`Processing assign discord id request for <@${playerDiscordId}>...`);
    if (!interaction.member.roles.cache.has(config.discord.roles.moderator)) {
      await interaction.editReply(`${EMOJI_FAIL} Only a moderator can assign a player discord id.`);
      return;
    }
    const res = await assignDiscordId(matchId, playerId, playerDiscordId, assignDiscordIdMsg.id);

    const updatedEmbed = buildReportEmbed(res, {
      reporterId: interaction.user.id,
    });
    const embedMsgId = (res as BaseReport).discord_messages_id_list[0];
    const message = await interaction.channel?.messages.fetch(embedMsgId);
    if (message) {
      await message.edit({ embeds: [updatedEmbed] });
    }

    const header =
      `${EMOJI_CONFIRM} <@${playerDiscordId}> (${playerDiscordId}) Discord ID assigned by <@${interaction.user.id}>\n` +
      `Match ID: **${res.match_id}**\n`;

    const full = header + convertMatchToStr(res as BaseReport, false);
    assignDiscordIdMsg.edit(full);
  } catch (err: any) {
    const msg = err?.body ? `${err.message}: ${JSON.stringify(err.body)}` : (err?.message ?? "Unknown error");
    await interaction.editReply(`${EMOJI_FAIL} Discord ID assignment failed: ${msg}`);
  }
}
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import { config } from "../../config";
import { EMOJI_CONFIRM, EMOJI_FAIL, MAX_DISCORD_LEN } from "../../config/constants";
import { getMatch, assignSub } from "../../services/reporting.service";
import { buildReportEmbed } from "../../ui/layout/report.layout";
import { convertMatchToStr } from "../../utils/convert-match-to-str";

import type { BaseReport } from "../../types/reports";

export const data = new SlashCommandBuilder()
  .setName("assign-sub")
  .setDescription("Assign the sub out for a player.")
  .addStringOption(option =>
    option.setName("match-id")
      .setDescription("ID of the match to assign substitute for a player")
      .setRequired(true),
  )
  .addStringOption(option =>
    option.setName("sub-in-id")
      .setDescription("ID of the player in this match to assign substitute in for")
      .setRequired(true),
  )
  .addStringOption(option =>
    option.setName("sub-out-discord-id")
      .setDescription("Discord ID of the player in this match who substituted out")
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
  const subInId = interaction.options.getString("sub-in-id", true) as string;
  const subOutDiscordID = interaction.options.getString("sub-out-discord-id", true) as string;

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
    const getMatchRes = await getMatch(matchId);
    if (getMatchRes?.reporter_discord_id != interaction.user.id &&
        !interaction.member.roles.cache.has(config.discord.roles.moderator)) {
      await interaction.editReply(`${EMOJI_FAIL} Only original reporter <@${getMatchRes?.reporter_discord_id}> or a moderator can assign subs`);
      return;
    }
    const subInPlayerIndex = parseInt(subInId) - 1;
    if (subInPlayerIndex < 0 || subInPlayerIndex >= (getMatchRes?.players.length ?? 0)) {
      await interaction.editReply(`${EMOJI_FAIL} Invalid sub in player ID ${subInId} for match ${matchId}`);
      return;
    }
    const subInPlayer = getMatchRes?.players[subInPlayerIndex];
    const assignSubMsg = await interaction.editReply(`Assigning substitute...\nSUB IN:<@${subInPlayer.discord_id}>\nSUB OUT:<@${subOutDiscordID}>`);
    const res = await assignSub(matchId, subInPlayerIndex.toString(), subOutDiscordID, assignSubMsg.id);

    const updatedEmbed = buildReportEmbed(res, {
      reporterId: interaction.user.id,
    });
    const embedMsgId = (res as BaseReport).discord_messages_id_list[0];
    const message = await interaction.channel?.messages.fetch(embedMsgId);
    if (message) {
      await message.edit({ embeds: [updatedEmbed] });
    }

    const header =
      `${EMOJI_CONFIRM} Substitute assigned by <@${interaction.user.id}>\nSUB IN:<@${subInPlayer.discord_id}>. SUB OUT:<@${subOutDiscordID}>` +
      `Match ID: **${res.match_id}**\n`;

    const full = header + convertMatchToStr(res as BaseReport, false);
    assignSubMsg.edit(full);
  } catch (err: any) {
    const msg = err?.body ? `${err.message}: ${JSON.stringify(err.body)}` : (err?.message ?? "Unknown error");
    await interaction.editReply(`${EMOJI_FAIL} Discord ID assignment failed: ${msg}`);
  }
}
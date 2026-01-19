import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import { config } from "../../config";
import { EMOJI_CONFIRM, EMOJI_FAIL, MAX_DISCORD_LEN } from "../../config/constants";
import { approveMatch } from "../../services/reporting.service";
import { buildReportEmbed } from "../../ui/layout/report.layout";
import { convertMatchToStr, getPlayerListMessage } from "../../utils/convert-match-to-str";
import { chunkByLength } from "../../utils/chunk-by-length";

import type { BaseReport } from "../../types/reports";

export const data = new SlashCommandBuilder()
  .setName("approve-report")
  .setDescription("Finalizes reporting a game.")
  .addStringOption(option =>
    option.setName("match-id")
      .setDescription("ID of the match to finalize")
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

  const errors: string[] = [];

  if (errors.length) {
    await interaction.reply({
      content: `${EMOJI_FAIL} FAIL\n${errors.map(e => `• ${e}`).join("\n")}`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({
    flags: MessageFlags.Ephemeral,
  });

  try {
    if (!interaction.inCachedGuild()) throw new Error('Not a cached guild');
    if (!interaction.member.roles.cache.has(config.discord.roles.moderator)) {
      await interaction.editReply(`${EMOJI_FAIL} Only a moderator can approve a report`);
      return;
    }
    const res = await approveMatch(matchId, interaction.user.id);
    var historyChannelId;
    if (interaction.channelId == config.discord.channels.civ6realtimeUploads) {
      historyChannelId = config.discord.channels.civ6realtimeReportingHistory;
    } else if (interaction.channelId == config.discord.channels.civ6cloudUploads) {
      historyChannelId = config.discord.channels.civ6cloudReportingHistory;
    } else if (interaction.channelId == config.discord.channels.civ7realtimeUploads) {
      historyChannelId = config.discord.channels.civ7realtimeReportingHistory;
    } else if (interaction.channelId == config.discord.channels.civ7cloudUploads) {
      historyChannelId = config.discord.channels.civ7cloudReportingHistory;
    } else {
      await interaction.editReply(`${EMOJI_FAIL} This command can only be used in the designated reporting channels.`);
      return;
    }
    const historyChannel = interaction.guild?.channels.cache.get(historyChannelId);
    if (!historyChannel || !historyChannel.isTextBased()) {
      await interaction.editReply(`${EMOJI_FAIL} History channel ${historyChannelId} not found or is not text-based.`);
      return;
    }

    const playerList = getPlayerListMessage(res, "", "\t");
    const embed = buildReportEmbed(res, {
      approverId: interaction.user.id,
      isFinal: true
    });
    await historyChannel.send({
      content: playerList,
      embeds: [embed] 
    }); 
    for (var msg in res.discord_messages_id_list) {
      try {
        const message = await interaction.channel?.messages.fetch(res.discord_messages_id_list[msg]);
        if (message) {
          await message.delete();
        }
      } catch (e) {
        console.log(`Failed to delete message id ${res.discord_messages_id_list[msg]} for match ${matchId}`);
      }
    }
    await interaction.editReply(`Report is approved successfully!`);
  } catch (err: any) {
    const msg = err?.body ? `${err.message}: ${JSON.stringify(err.body)}` : (err?.message ?? "Unknown error");
    await interaction.editReply(`${EMOJI_FAIL} Match approval failed: ${msg}`)
      .then(repliedMessage => {
          setTimeout(() => repliedMessage.delete(), 60 * 1000);
        })
      .catch();
  }
}
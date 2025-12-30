import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
  GuildBasedChannel,
} from "discord.js";
import { config } from "../config";
import { EMOJI_CONFIRM, EMOJI_FAIL, EMOJI_REPORT } from "../config/constants";
import { setPlacements, getMatch } from "../services/reporting.service";
import { buildReportEmbed } from "../ui/layout/report.layout";
import { getPlayerListMessage, isValidOrder } from "../utils/convert-match-to-str";
import { GetMatchResponse } from "../api";

function getLeaderboardPost(interaction: ChatInputCommandInteraction, match: GetMatchResponse) {
  let postId = '';
  if (match.game == 'civ6') {
    if (match.is_cloud) {
      if (match.game_mode == 'FFA') {
        postId = config.discord.channels.civ6PbcFfaLeaderboard;
      } else if (match.game_mode == 'Teamer') {
        postId = config.discord.channels.civ6PbcTeamerLeaderboard;
      } else if (match.game_mode == 'Duel') {
        postId = config.discord.channels.civ6PbcDuelLeaderboard;
      }
    } else {
      if (match.game_mode == 'FFA') {
        postId = config.discord.channels.civ6RealtimeFfaLeaderboard;
      } else if (match.game_mode == 'Teamer') {
        postId = config.discord.channels.civ6RealtimeTeamerLeaderboard;
      } else if (match.game_mode == 'Duel') {
        postId = config.discord.channels.civ6RealtimeDuelLeaderboard;
      }
    }
  } else if (match.game == 'civ7') {
    if (match.is_cloud) {
      if (match.game_mode == 'FFA') {
        postId = config.discord.channels.civ7PbcFfaLeaderboard;
      } else if (match.game_mode == 'Teamer') {
        postId = config.discord.channels.civ7PbcTeamerLeaderboard;
      } else if (match.game_mode == 'Duel') {
        postId = config.discord.channels.civ7PbcDuelLeaderboard;
      }
    } else {
      if (match.game_mode == 'FFA') {
        postId = config.discord.channels.civ7RealtimeFfaLeaderboard;
      } else if (match.game_mode == 'Teamer') {
        postId = config.discord.channels.civ7RealtimeTeamerLeaderboard;
      } else if (match.game_mode == 'Duel') {
        postId = config.discord.channels.civ7RealtimeDuelLeaderboard;
      }
    }
  } else {
    // should not happen
    return null;
  }
  const thread = interaction.guild?.channels.cache.get(postId) as GuildBasedChannel;
  return thread;
}

export async function updateLeaderboard(interaction: ChatInputCommandInteraction, match: GetMatchResponse) {
  try {
    var leaderboardPost = getLeaderboardPost(interaction, match);
    if (!leaderboardPost || !leaderboardPost.isTextBased()) {
      return;
    }
    const rankingMessages = await leaderboardPost.messages.fetch({ limit: 100 });
    var rankingMessagesArray = rankingMessages.map(m => m);
    if (rankingMessages.size == 0) {
      for (var i = 0; i < 10; i++) {
        rankingMessagesArray.push(await leaderboardPost.send(`**Rank ${i+1}**\nNo data yet.`));
      }
    }

    // const leaderboard = getLeaderboard(match);
    rankingMessagesArray.reverse();
    for (var i = 0; i < rankingMessagesArray.length; i++) {
      const msg = rankingMessagesArray[i];
      await msg.edit(`Leaderboard entry for Rank ${i * 10 + 1} - ${i * 10 + 10}...`);
    }
  } catch (err: any) {
    const msg = err?.body ? `${err.message}: ${JSON.stringify(err.body)}` : (err?.message ?? "Unknown error");
    await interaction.editReply(`${EMOJI_FAIL} Update leaderboard failed: ${msg}`)
      .then(repliedMessage => {
          setTimeout(() => repliedMessage.delete(), 60 * 1000);
        })
      .catch();
  }
}
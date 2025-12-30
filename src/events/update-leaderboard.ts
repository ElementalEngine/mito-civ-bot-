import { Events } from 'discord.js';
import { Client, ChatInputCommandInteraction, GuildBasedChannel } from 'discord.js';
import { config } from "../config";

export const name = Events.ClientReady;
export const once = false;

const leaderboardsDict = {
  "Civ6_PBC_FFA": config.discord.channels.civ6PbcFfaLeaderboard,
  "Civ6_PBC_Teamer": config.discord.channels.civ6PbcTeamerLeaderboard,
  "Civ6_PBC_Duel": config.discord.channels.civ6PbcDuelLeaderboard,
  "Civ6_Realtime_FFA": config.discord.channels.civ6RealtimeFfaLeaderboard,
  "Civ6_Realtime_Teamer": config.discord.channels.civ6RealtimeTeamerLeaderboard,
  "Civ6_Realtime_Duel": config.discord.channels.civ6RealtimeDuelLeaderboard,
  "Civ7_PBC_FFA": config.discord.channels.civ7PbcFfaLeaderboard,
  "Civ7_PBC_Teamer": config.discord.channels.civ7PbcTeamerLeaderboard,
  "Civ7_PBC_Duel": config.discord.channels.civ7PbcDuelLeaderboard,
  "Civ7_Realtime_FFA": config.discord.channels.civ7RealtimeFfaLeaderboard,
  "Civ7_Realtime_Teamer": config.discord.channels.civ7RealtimeTeamerLeaderboard,
  "Civ7_Realtime_Duel": config.discord.channels.civ7RealtimeDuelLeaderboard,
}

function getLeaderboardPost(client: Client, leaderboardId: string) {
  const thread = client.channels.cache.get(leaderboardId) as GuildBasedChannel;
  return thread;
}

async function updateLeaderboard(client: Client, leaderboardName: string, leaderboardId: string): Promise<void> {
  console.log(`Updating leaderboard: ${leaderboardName} with id ${leaderboardId}`);
  var leaderboardPost = getLeaderboardPost(client, leaderboardId);
  if (!leaderboardPost || !leaderboardPost.isTextBased()) {
    return;
  }
  const rankingMessages = await leaderboardPost.messages.fetch({ limit: 100 });
  var rankingMessagesArray = rankingMessages.map(m => m);
  while (rankingMessagesArray.length < 10) {
    rankingMessagesArray.push(await leaderboardPost.send(`Placeholder for leaderboard entry.`));
  }

  // const leaderboard = getLeaderboard(match);
  rankingMessagesArray.reverse();
  for (var i = 0; i < rankingMessagesArray.length; i++) {
    const msg = rankingMessagesArray[i];
    await msg.edit(`Leaderboard entry for Rank ${i * 10 + 1} - ${i * 10 + 10}...`);
  }
}

async function updateLeaderboards(client: Client): Promise<void> {
  try {
    for (const leaderboard in leaderboardsDict) {
      await updateLeaderboard(client, leaderboard, leaderboardsDict[leaderboard as keyof typeof leaderboardsDict]);
    }
    console.log("✅ Leaderboards updated successfully");
  } catch (err: any) {
    console.error("❌ Failed to update leaderboards:", err);
  }
}

export async function execute(client: Client): Promise<void> {
  // updating leaderboards every 5 minutes
  setInterval(updateLeaderboards, 5 * 60 * 1000, client);
}

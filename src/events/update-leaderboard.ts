import { Events } from 'discord.js';
import { Client, ChatInputCommandInteraction, GuildBasedChannel } from 'discord.js';
import { config } from "../config";
import { getLeaderboardRanking } from "../services/reporting.service";
import { Leaderboard } from "../types/leaderboard";

export const name = Events.ClientReady;
export const once = false;

const civ6_pbc_ffa_leaderboard = {
  name: "Civ6_PBC_FFA",
  game: "civ6",
  game_type: "PBC",
  game_mode: "FFA",
  thread_id: config.discord.channels.civ6PbcFfaLeaderboard
}
const civ6_pbc_teamer_leaderboard = {
  name: "Civ6_PBC_Teamer",
  game: "civ6",
  game_type: "PBC",
  game_mode: "Teamer",
  thread_id: config.discord.channels.civ6PbcTeamerLeaderboard
}
const civ6_pbc_duel_leaderboard = {
  name: "Civ6_PBC_Duel",
  game: "civ6",
  game_type: "PBC",
  game_mode: "Duel",
  thread_id: config.discord.channels.civ6PbcDuelLeaderboard
}
const civ6_realtime_ffa_leaderboard = {
  name: "Civ6_Realtime_FFA",
  game: "civ6",
  game_type: "realtime",
  game_mode: "FFA",
  thread_id: config.discord.channels.civ6RealtimeFfaLeaderboard
}
const civ6_realtime_teamer_leaderboard = {
  name: "Civ6_Realtime_Teamer",
  game: "civ6",
  game_type: "realtime",
  game_mode: "Teamer",
  thread_id: config.discord.channels.civ6RealtimeTeamerLeaderboard
}
const civ6__duel_leaderboard = {
  name: "Civ6_Realtime_Duel",
  game: "civ6",
  game_type: "realtime",
  game_mode: "Duel",
  thread_id: config.discord.channels.civ6RealtimeDuelLeaderboard
}
const civ7_pbc_ffa_leaderboard = {
  name: "Civ7_PBC_FFA",
  game: "civ7",
  game_type: "PBC",
  game_mode: "FFA",
  thread_id: config.discord.channels.civ7PbcFfaLeaderboard
}
const civ7_pbc_teamer_leaderboard = {
  name: "Civ7_PBC_Teamer",
  game: "civ7",
  game_type: "PBC",
  game_mode: "Teamer",
  thread_id: config.discord.channels.civ7PbcTeamerLeaderboard
}
const civ7_pbc_duel_leaderboard = {
  name: "Civ7_PBC_Duel",
  game: "civ7",
  game_type: "PBC",
  game_mode: "Duel",
  thread_id: config.discord.channels.civ7PbcDuelLeaderboard
}
const civ7_realtime_ffa_leaderboard = {
  name: "Civ7_Realtime_FFA",
  game: "civ7",
  game_type: "realtime",
  game_mode: "FFA",
  thread_id: config.discord.channels.civ7RealtimeFfaLeaderboard
}
const civ7_realtime_teamer_leaderboard = {
  name: "Civ7_Realtime_Teamer",
  game: "civ7",
  game_type: "realtime",
  game_mode: "Teamer",
  thread_id: config.discord.channels.civ7RealtimeTeamerLeaderboard
}
const civ7__duel_leaderboard = {
  name: "Civ7_Realtime_Duel",
  game: "civ7",
  game_type: "realtime",
  game_mode: "Duel",
  thread_id: config.discord.channels.civ7RealtimeDuelLeaderboard
}

const leaderboardsList: Leaderboard[] = [
  civ6_pbc_ffa_leaderboard,
  civ6_pbc_teamer_leaderboard,
  civ6_pbc_duel_leaderboard,
  civ6_realtime_ffa_leaderboard,
  civ6_realtime_teamer_leaderboard,
  civ6__duel_leaderboard,
  civ7_pbc_ffa_leaderboard,
  civ7_pbc_teamer_leaderboard,
  civ7_pbc_duel_leaderboard,
  civ7_realtime_ffa_leaderboard,
  civ7_realtime_teamer_leaderboard,
  civ7__duel_leaderboard
];

function getLeaderboardThread(client: Client, thread_id: string) {
  const thread = client.channels.cache.get(thread_id) as GuildBasedChannel;
  return thread;
}

function leaderboardMessage(leaderboardRanking: any, startIdx: number, endIdx: number): string {
  let message = ``;
  if (startIdx === 0) {
    message += `\`Rank  Skill\t[wins - loss]\tWin%\t1st\`\n`;
  }
  for (let i = startIdx; i < endIdx; i++) {
    if (i >= leaderboardRanking.rankings.length || !leaderboardRanking.rankings[i]) {
      message += `\`#${i + 1}\`\n`;
      continue;
    }
    const entry = leaderboardRanking.rankings[i];
    let rank = String(`#${i + 1}`).padEnd(3);
    let discord_id = entry.discord_id;
    let rating = `${String(entry.rating).padStart(4)}`;
    let wins = entry.wins;
    let losses = entry.games_played - entry.wins;
    let win_loss_record = `[${String(wins).padStart(4)} - ${String(losses).padEnd(4)}]`;
    let win_percentage = ((entry.wins / (entry.games_played)) * 100) as number;
    let win_perc_str = String(win_percentage).padStart(3);
    let number_of_first_places = String(entry.first).padStart(3);
    message += `\`${rank}\t${rating}\t${win_loss_record}\t${win_perc_str}\%\t${number_of_first_places}\`\t<@${discord_id}>\n`;
  }
  return message;
}

async function updateLeaderboard(client: Client, leaderboard: Leaderboard): Promise<void> {
  console.log(`Updating leaderboard: ${leaderboard.name} with id ${leaderboard.thread_id}`);
  var leaderboardThread = getLeaderboardThread(client, leaderboard.thread_id);
  if (!leaderboardThread || !leaderboardThread.isTextBased()) {
    return;
  }
  const rankingMessages = await leaderboardThread.messages.fetch({ limit: 100 });
  var rankingMessagesArray = rankingMessages.map(m => m);
  while (rankingMessagesArray.length < 10) {
    rankingMessagesArray.push(await leaderboardThread.send(`Placeholder for leaderboard entry.`));
  }
  rankingMessagesArray.reverse();

  const leaderboardRanking = await getLeaderboardRanking(leaderboard.game, leaderboard.game_type, leaderboard.game_mode);
  for (var i = 0; i < rankingMessagesArray.length; i++) {
    const msg = rankingMessagesArray[i];
    await msg.edit(leaderboardMessage(leaderboardRanking, i * 10, i * 10 + 10));
  }
}

async function updateLeaderboards(client: Client): Promise<void> {
  try {
    for (var i = 0; i < leaderboardsList.length; i++) {
      var leaderboard = leaderboardsList[i];
      await updateLeaderboard(client, leaderboard);
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

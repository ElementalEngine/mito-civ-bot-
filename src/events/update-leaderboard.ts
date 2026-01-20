import { Events } from 'discord.js';
import { Client, ChatInputCommandInteraction, GuildBasedChannel } from 'discord.js';
import { getLeaderboardRanking } from "../services/reporting.service";
import { Leaderboard } from "../types/leaderboard";
import { leaderboardsList } from "./leaderboards-list";

export const name = Events.ClientReady;
export const once = false;

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getLeaderboardThread(client: Client, thread_id: string) {
  const thread = client.channels.cache.get(thread_id) as GuildBasedChannel;
  return thread;
}

function getLeaderboardMessage(leaderboardRanking: any, startIdx: number, endIdx: number): string {
  let message = ``;
  if (startIdx === 0) {
    message += `\`Rank   Skill\t[wins - loss]\tWin%\t   1st\`\n`;
  }
  for (let i = startIdx; i < endIdx; i++) {
    if (i >= leaderboardRanking.rankings.length || !leaderboardRanking.rankings[i]) {
      message += `\`#${i + 1}\`\n`;
      continue;
    }
    const entry = leaderboardRanking.rankings[i];
    let rank = String(`#${i + 1}`).padEnd(4);
    let discord_id = entry.discord_id;
    let rating = `${String(entry.rating).padStart(4)}`;
    let wins = entry.wins;
    let losses = entry.games_played - entry.wins;
    let win_loss_record = `[${String(wins).padStart(4)} - ${String(losses).padEnd(4)}]`;
    let win_percentage = (((entry.wins / (entry.games_played)) * 100) as number).toFixed(1);
    let win_perc_str = String(`${win_percentage}\%`).padEnd(6);
    let number_of_first_places = String(entry.first).padStart(4);
    message += `\`${rank}\t${rating}\t${win_loss_record}\t${win_perc_str}\t${number_of_first_places}\`\t<@${discord_id}>\n`;
  }
  return message;
}

async function updateLeaderboard(client: Client, leaderboard: Leaderboard): Promise<void> {
  console.log(`${new Date().toLocaleTimeString()}: Updating leaderboard: ${leaderboard.name} with id ${leaderboard.thread_id}`);
  var leaderboardThread = getLeaderboardThread(client, leaderboard.thread_id);
  if (!leaderboardThread || !leaderboardThread.isTextBased()) {
    return;
  }
  const rankingMessages = (await leaderboardThread.messages.fetch({ limit: 10 })).filter(m => m.author.bot);
  await sleep(10000); // to avoid rate limits
  var rankingMessagesArray = rankingMessages.map(m => m);
  while (rankingMessagesArray.length < 10) {
    rankingMessagesArray.splice(0, 0, await leaderboardThread.send(`Placeholder for leaderboard entry.`));
    await sleep(2000); // to avoid rate limits
  }
  rankingMessagesArray.reverse();

  const leaderboardRanking = await getLeaderboardRanking(leaderboard.game, leaderboard.game_type, leaderboard.game_mode, leaderboard.is_seasonal, leaderboard.is_combined);
  for (var i = 0; i < rankingMessagesArray.length; i++) {
    const msg = rankingMessagesArray[i];
    const leaderboardMsg = getLeaderboardMessage(leaderboardRanking, i * 10, i * 10 + 10);
    // console.log(`${new Date().toLocaleTimeString()} Updating leaderboard message ${i + 1}/10 for ${leaderboard.name}`);
    await msg.edit(leaderboardMsg);
    // console.log(`${new Date().toLocaleTimeString()} Updated leaderboard message ${i + 1}/10 for ${leaderboard.name}`);
    await sleep(4000); // to avoid rate limits
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
  // updating leaderboards every hour
  setInterval(updateLeaderboards, 60 * 60 * 1000, client);
}

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import { config } from "../../config";
import { setPlacements } from "../../services/reporting.service";
import { match } from "assert";

type GameMode = "realtime" | "cloud";

export const data = new SlashCommandBuilder()
  .setName("change-report-order")
  .setDescription("Change the order of players in a game.")
  .addIntegerOption(option =>
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
    var reply_str = `${EMOJI_CONFIRM} Match reported by ${interaction.user} ${interaction.user.id}\nMatch ID: **${res.match_id}**\n`;
    // if (edition === "CIV6") {
    //   var player_list = res.players.map(p => `<@${p.discord_id}>\t\t${p.user_name}\t\t${civ6_leaders_dict[p.civ]} `).join("\n");
    //   reply_str += `Game: ${res.game} | Turn: ${res.turn} | Map: ${res.map_type} | Mode: ${res.game_mode}\n\n`;
    //   reply_str += `${player_list}`;
    // } else {
    //   var player_list = res.players.map(p => `<@${p.discord_id}>\t\t${p.user_name}\t\t${civ7_civs_dict[p.civ]} ${civ7_leaders_dict[p.leader]}`).join("\n");
    //   reply_str += `Game: ${res.game} | Turn: ${res.turn} | Age: ${res.age} | Map: ${res.map_type} | Mode: ${res.game_mode}\n`;
    //   reply_str += `${player_list}`;
    // }
    await interaction.editReply('Save parsed successfully!');
    await interaction.channel?.send({content: reply_str});
  } catch (err: any) {
    const msg = err?.body ? `${err.message}: ${JSON.stringify(err.body)}` : (err?.message ?? "Unknown error");
    await interaction.editReply(`${EMOJI_FAIL} Upload failed: ${msg}`);
  }
}
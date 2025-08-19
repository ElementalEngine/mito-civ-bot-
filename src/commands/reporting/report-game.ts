import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import { config } from "../../config";
import { validateSaveAttachment } from "../../utils/validate-save-attachment";
import { CivEdition, EMOJI_CONFIRM, EMOJI_FAIL } from "../../config/constants";
import { submitSaveForReport } from "../../services/reporting.service";
import { civ7_civs_dict, civ7_leaders_dict } from "./civ7leaders";
import { civ6_leaders_dict } from "./civ6leaders";

type GameMode = "realtime" | "cloud";

export const data = new SlashCommandBuilder()
  .setName("report-game")
  .setDescription("Validate the channel & save, then upload to the reporter backend.")
  .addStringOption(option =>
    option.setName("game-mode")
      .setDescription("Real-time or Cloud")
      .addChoices(
        { name: "Real-time", value: "realtime" },
        { name: "Cloud", value: "cloud" },
      )
      .setRequired(true),
  )
  .addStringOption(option =>
    option.setName("game-edition")
      .setDescription("Which Civilization edition")
      .addChoices(
        { name: "Civilization VI (.Civ6Save)", value: "CIV6" },
        { name: "Civilization VII (.Civ7Save)", value: "CIV7" },
      )
      .setRequired(true),
  )
  .addAttachmentOption(option =>
    option.setName("game-save")
      .setDescription("Upload the .Civ6Save or .Civ7Save file (≤7MB)")
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

  const mode = interaction.options.getString("game-mode", true) as GameMode;
  const edition = interaction.options.getString("game-edition", true) as CivEdition;
  const save = interaction.options.getAttachment("game-save", true);

  const realtimeChannelId = config.discord.channels.realtimeUploads;
  const cloudChannelId = config.discord.channels.cloudUploads;
  const expectedChannelId = mode === "realtime" ? realtimeChannelId : cloudChannelId;

  const errors: string[] = [];

  if (!expectedChannelId) {
    errors.push(
      mode === "realtime"
        ? "Real-time uploads channel is not configured."
        : "Cloud uploads channel is not configured.",
    );
  } else if (interaction.channelId !== expectedChannelId) {
    errors.push(
      mode === "realtime"
        ? "Wrong channel for **Real-time**. Use the designated Real-time uploads channel."
        : "Wrong channel for **Cloud**. Use the designated Cloud uploads channel.",
    );
  }

  try {
    validateSaveAttachment(save, edition);
  } catch (e: any) {
    errors.push(e?.message || "Invalid save attachment.");
  }

  if (errors.length) {
    await interaction.reply({
      content: `${EMOJI_FAIL} FAIL\n${errors.map(e => `• ${e}`).join("\n")}`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const res = await submitSaveForReport(
      save.url,
      save.name ?? (edition === "CIV6" ? "game.Civ6Save" : "game.Civ7Save"),
    );
    var reply_str = `${EMOJI_CONFIRM} Parsed match **${res.match_id}**. Reported by ${interaction.user} ${interaction.user.id}\n\n`;
    if (edition === "CIV6") {
      var player_list = res.players.map(p => `<@${p.discord_id}>\t\t${p.user_name}\t\t${civ6_leaders_dict[p.civ]} `).join("\n");
      reply_str += `Game: ${res.game} | Turn: ${res.turn} | Map: ${res.map_type} | Mode: ${res.game_mode}\n\n`;
      reply_str += `${player_list}`;
    } else {
      var player_list = res.players.map(p => `<@${p.discord_id}>\t\t${p.user_name}\t\t${civ7_civs_dict[p.civ]} ${civ7_leaders_dict[p.leader]}`).join("\n");
      reply_str += `Game: ${res.game} | Turn: ${res.turn} | Age: ${res.age} | Map: ${res.map_type} | Mode: ${res.game_mode}\n`;
      reply_str += `${player_list}`;
    }
    await interaction.editReply('Save parsed successfully!');
    await interaction.channel?.send({content: reply_str});
  } catch (err: any) {
    const msg = err?.body ? `${err.message}: ${JSON.stringify(err.body)}` : (err?.message ?? "Unknown error");
    await interaction.editReply(`${EMOJI_FAIL} Upload failed: ${msg}`);
  }
}
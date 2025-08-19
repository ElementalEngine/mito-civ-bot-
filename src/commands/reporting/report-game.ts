import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import { config } from "../../config";
import { validateSaveAttachment } from "../../utils/validate-save-attachment";
import { CivEdition, EMOJI_CONFIRM, EMOJI_FAIL, MAX_DISCORD_LEN } from "../../config/constants";
import { submitSaveForReport } from "../../services/reporting.service";
import { chunkByLength } from "../../utils/chunk-by-length";

import { lookupCiv6Leader } from "../../data/civ6-leaders";
import { lookupCiv7Civ } from "../../data/civ7-civs";
import { lookupCiv7Leader } from "../../data/civ7-leaders";

import type { GameMode, Civ6Report, Civ7Report } from "../../types/reports";

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

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

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
    await interaction.editReply({
      content: `${EMOJI_FAIL} FAIL\n${errors.map(e => `• ${e}`).join("\n")}`,
    });
    return;
  }

  try {
    const res = await submitSaveForReport(
      save.url,
      save.name ?? (edition === "CIV6" ? "game.Civ6Save" : "game.Civ7Save"),
    );

    if (res?.repeated === true) {
      await interaction.editReply(`Match already reported! Match ID: ${res.match_id}`);
      return;
    }

    const header =
      `${EMOJI_CONFIRM} Match reported by <@${interaction.user.id}> (${interaction.user.id})\n` +
      `Match ID: **${res.match_id}**\n`;

    let meta = "";
    let body = "";

    if (edition === "CIV6") {
      const r = res as Civ6Report;
      meta = `Game: ${r.game} | Turn: ${r.turn} | Map: ${r.map_type} | Mode: ${r.game_mode}\n\n`;
      body = r.players
        .map(p => `<@${p.discord_id}>\t${p.user_name}\t${lookupCiv6Leader(p.civ)}`)
        .join("\n");
    } else {
      const r = res as Civ7Report;
      meta = `Game: ${r.game} | Turn: ${r.turn} | Age: ${r.age} | Map: ${r.map_type} | Mode: ${r.game_mode}\n\n`;
      body = r.players
        .map(p => `<@${p.discord_id}>\t${p.user_name}\t${lookupCiv7Civ(p.civ)} ${lookupCiv7Leader(p.leader)}`)
        .join("\n");
    }

    await interaction.editReply("Save parsed successfully!");

    const full = header + meta + body;
    for (const chunk of chunkByLength(full, MAX_DISCORD_LEN)) {
      await interaction.followUp({ content: chunk }); 
    }
  } catch (err: any) {
    const msg = err?.body ? `${err.message}: ${JSON.stringify(err.body)}` : (err?.message ?? "Unknown error");
    await interaction.editReply(`${EMOJI_FAIL} Upload failed: ${msg}`);
  }
}

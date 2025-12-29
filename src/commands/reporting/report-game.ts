import {
  EmbedBuilder,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import { config } from "../../config";
import { validateSaveAttachment } from "../../utils/validate-save-attachment";
import { CivEdition, EMOJI_CONFIRM, EMOJI_FAIL, MAX_DISCORD_LEN } from "../../config/constants";
import { submitSaveForReport, appendMessageIdList } from "../../services/reporting.service";
import { buildReportEmbed } from "../../ui/layout/report.layout";
import { chunkByLength } from "../../utils/chunk-by-length";
import { convertMatchToStr } from "../../utils/convert-match-to-str";
import {
  EMOJI_REPORT,
} from "../../config/constants";

import type { GameMode, BaseReport } from "../../types/reports";
import type { UploadSaveResponse } from "../../api/types";

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

  await interaction.deferReply();

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
    }).then(repliedMessage => {
        setTimeout(() => repliedMessage.delete(), 60 * 1000);
      })
      .catch();
    return;
  }

  try {
    const pendingEmbed = new EmbedBuilder()
      .setDescription(`${EMOJI_REPORT} Uploading and processing your save file, please wait...`);
    const pendingMsg = await interaction.editReply(
      { embeds : [pendingEmbed] }
    );
    const res: UploadSaveResponse = await submitSaveForReport(
      save.url,
      save.name ?? (edition === "CIV6" ? "game.Civ6Save" : "game.Civ7Save"),
      interaction.user.id,
      mode === "cloud",
      pendingMsg.id
    );

    if (res?.repeated === true) {
      await interaction.editReply(`Match already reported! Match ID: ${res.match_id}`)
        .then(repliedMessage => {
          setTimeout(() => repliedMessage.delete(), 60 * 1000);
        })
        .catch();
      return;
    }

    // Build and send a SINGLE compact embed based on returned data
    const embed = buildReportEmbed(res, {
      reporterId: interaction.user.id,
      // host: userMention(interaction.user.id), // prefill if desired later
    });
    const embedMsg = await interaction.editReply({
      embeds: [embed],
    });

    await embedMsg.react("✅");
    await embedMsg.react("❌");

    // Ping message
    const header =
      `${EMOJI_CONFIRM} Match reported by <@${interaction.user.id}>\n` +
      `Match ID: **${res.match_id}**\n`;

    const full = header + convertMatchToStr(res as BaseReport, true);
    var messageIdsList = []
    for (const chunk of chunkByLength(full, MAX_DISCORD_LEN)) {
      var followUp = await interaction.followUp({ content: chunk }); 
      messageIdsList.push(followUp.id);
    }
    const appendRes: UploadSaveResponse = await appendMessageIdList(
      res.match_id,
      messageIdsList
    );
    if (!appendRes) {
      console.error("Failed to append message ID list for match:", res.match_id);
    }
  } catch (err: any) {
    const msg = err?.body
      ? `${err.message}: ${JSON.stringify(err.body)}`
      : (err?.message ?? "Unknown error");
    await interaction.editReply(`${EMOJI_FAIL} Upload failed: ${msg}`)
      .then(repliedMessage => {
          setTimeout(() => repliedMessage.delete(), 60 * 1000);
        })
      .catch();
  }
}

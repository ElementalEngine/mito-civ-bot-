import {
  EmbedBuilder,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import { config } from "../../config.js";
import { validateSaveAttachment } from "../../utils/validate-save-attachment.js";
import {
  EMOJI_CONFIRM,
  EMOJI_FAIL,
  EMOJI_REPORT,
  MAX_DISCORD_LEN,
} from "../../config/constants.js";
import type { CivEdition } from "../../config/constants.js";
import { submitSaveForReport, appendMessageIdList } from "../../services/reporting.service.js";
import { buildReportEmbed } from "../../ui/report.layout.js";
import { chunkByLength } from "../../utils/chunk-by-length.js";
import { convertMatchToStr } from "../../utils/convert-match-to-str.js";

import type { GameMode, BaseReport } from "../../types/reports.js";
import type { UploadSaveResponse } from "../../api/types.js";

export const data = new SlashCommandBuilder()
  .setName("report-game")
  .setDescription("Validate the channel & save, then upload to the reporter backend.")
  .addAttachmentOption(option =>
    option.setName("game-save")
      .setDescription("Upload the .Civ6Save or .Civ7Save file (≤12MB)")
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

  const save = interaction.options.getAttachment("game-save", true);

  const civ6realtimeChannelId = config.discord.channels.civ6realtimeUploads;
  const civ7realtimeChannelId = config.discord.channels.civ7realtimeUploads;
  const civ6cloudChannelId = config.discord.channels.civ6cloudUploads;
  const civ7cloudChannelId = config.discord.channels.civ7cloudUploads;
  const edition = interaction.channelId === civ6realtimeChannelId || interaction.channelId === civ6cloudChannelId
    ? "CIV6"
    : "CIV7";
  const mode = interaction.channelId === civ6realtimeChannelId || interaction.channelId === civ7realtimeChannelId
    ? "realtime"
    : "cloud";

  const errors: string[] = [];

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
      const duplicateReportEmbed = new EmbedBuilder()
        .setDescription(`${EMOJI_FAIL} Match already reported! Match ID: **${res.match_id}**`);
      await pendingMsg.edit(
        { embeds: [duplicateReportEmbed] }
      )
        .then(repliedMessage => {
          setTimeout(() => repliedMessage.delete(), 60 * 1000);
        })
        .catch();
      return;
    }

    // Build and send a SINGLE compact embed based on returned data
    const embed = buildReportEmbed(res, {
      reporterId: interaction.user.id,
    });
    await interaction.editReply({
      embeds: [embed],
    });

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

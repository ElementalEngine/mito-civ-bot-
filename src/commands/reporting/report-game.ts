import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { validateSaveAttachment } from '../../utils/validate-save-type';
import { submitSaveForReport } from '../../services/reporting/game-report-service';
import { config } from '../../config';

export const data = new SlashCommandBuilder()
  .setName('upload-game-report')
  .setDescription('Upload a Civ6 or Civ7 save file for reporting')
  .addStringOption((option) =>
    option
      .setName('version')
      .setDescription('Which Civilization version the save file is for')
      .setRequired(true)
      .addChoices(
        { name: 'Civilization VI', value: 'civ6' },
        { name: 'Civilization VII', value: 'civ7' },
      ),
  )
  .addStringOption((option) =>
    option
      .setName('gametype')
      .setDescription('How the game was played')
      .setRequired(true)
      .addChoices(
        { name: 'Real-time', value: 'real-time' },
        { name: 'Cloud', value: 'cloud' },
      ),
  )
  .addAttachmentOption((option) =>
    option
      .setName('savefile')
      .setDescription('Your Civ6/Civ7 save file (.Civ6Save or .Civ7Save)')
      .setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const version = interaction.options.getString('version', true) as 'civ6' | 'civ7';
  const gameType = interaction.options.getString('gametype', true) as 'real-time' | 'cloud';
  const attachment = interaction.options.getAttachment('savefile', true);

  const { realtimeUploads, cloudUploads } = config.discord.channels;
  const currentChannelId = interaction.channelId;

  // Channel gating with helpful mentions
  if (gameType === 'real-time' && currentChannelId !== realtimeUploads) {
    await interaction.editReply({
      content: `❌ Real-time uploads must be in <#${realtimeUploads}>.`,
    });
    return;
  }
  if (gameType === 'cloud' && currentChannelId !== cloudUploads) {
    await interaction.editReply({
      content: `❌ Cloud uploads must be in <#${cloudUploads}>.`,
    });
    return;
  }

  try {
    // Validate attachment (size and extension)
    validateSaveAttachment(attachment, version);

    // Submit save file to backend service
    const { reportLink, summary } = await submitSaveForReport(
      attachment.url,
      attachment.name,
      version,
    );

    const reply = reportLink
      ? `✅ Report generated: ${reportLink}`
      : `✅ Processing complete. Summary:\n${summary}`;

    await interaction.editReply({ content: reply });
  } catch (error) {
    const message =
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message?: string }).message)
        : 'Failed to process your save file.';
    console.error('Game report error:', error);
    await interaction.editReply({ content: `❌ ${message}` });
  }
}
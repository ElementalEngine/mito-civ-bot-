import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { validateSaveAttachment } from '../../utils/validate-save';
import { submitSaveForReport } from '../../services/game-report-service';
import { config } from '../../config';

export const data = new SlashCommandBuilder()
  .setName('game-report')
  .setDescription('Upload a Civ6 or Civ7 save file for reporting')
  .addStringOption(option =>
    option
      .setName('version')
      .setDescription('Which Civilization version the save file is for')
      .setRequired(true)
      .addChoices(
        { name: 'Civilization VI', value: 'civ6' },
        { name: 'Civilization VII', value: 'civ7' }
      )
  )
  .addAttachmentOption(option =>
    option
      .setName('savefile')
      .setDescription('Your Civ6/Civ7 save file (.Civ6Save or .Civ7Save)')
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  const version = interaction.options.getString('version', true) as 'civ6' | 'civ7';
  const attachment = interaction.options.getAttachment('savefile', true);

  try {
    // Validate attachment (size and extension)
    validateSaveAttachment(attachment, version);

    // Submit save file to backend service
    const { reportLink, summary } = await submitSaveForReport(
      attachment.url,
      attachment.name,
      version
    );

    const reply = reportLink
      ? `✅ Report generated: ${reportLink}`
      : `✅ Processing complete. Summary:\n${summary}`;

    await interaction.editReply({ content: reply });
  } catch (error: any) {
    console.error('Game report error:', error);
    await interaction.editReply({ content: `❌ ${error.message || 'Failed to process your save file.'}` });
  }
}

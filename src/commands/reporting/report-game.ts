import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
} from 'discord.js';
import { config } from '../../config';
import { validateSaveAttachment } from '../../utils/validate-save-attachment';
import { CivEdition, EMOJI_CONFIRM, EMOJI_FAIL } from '../../config/constants';

type GameMode = 'realtime' | 'cloud';

export const data = new SlashCommandBuilder()
  .setName('report-game')
  .setDescription('Validate the channel and Civ save file (size + extension).')
  .addStringOption(o =>
    o.setName('game-mode')
      .setDescription('Real-time or Cloud')
      .addChoices(
        { name: 'Real-time', value: 'realtime' },
        { name: 'Cloud', value: 'cloud' },
      )
      .setRequired(true),
  )
  .addStringOption(o =>
    o.setName('game-edition')
      .setDescription('Which Civilization edition')
      .addChoices(
        { name: 'Civilization VI (.Civ6Save)', value: 'CIV6' },
        { name: 'Civilization VII (.Civ7Save)', value: 'CIV7' },
      )
      .setRequired(true),
  )
  .addAttachmentOption(o =>
    o.setName('game-save')
      .setDescription('Upload the .Civ6Save or .Civ7Save file (≤7MB)')
      .setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  // Fast command: do NOT defer.
  if (!interaction.inGuild()) {
    await interaction.reply({
      content: `${EMOJI_FAIL} This command must be used in a server.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const mode = interaction.options.getString('game-mode', true) as GameMode;
  const edition = interaction.options.getString('game-edition', true) as CivEdition;
  const save = interaction.options.getAttachment('game-save', true);

  const realtimeChannelId = config.discord.channels.realtimeUploads;
  const cloudChannelId = config.discord.channels.cloudUploads;
  const expectedChannelId = mode === 'realtime' ? realtimeChannelId : cloudChannelId;

  const errors: string[] = [];

  if (!expectedChannelId) {
    errors.push(
      mode === 'realtime'
        ? 'Real-time uploads channel is not configured.'
        : 'Cloud uploads channel is not configured.',
    );
  } else if (interaction.channelId !== expectedChannelId) {
    errors.push(
      mode === 'realtime'
        ? 'Wrong channel for **Real-time**. Use the designated Real-time uploads channel.'
        : 'Wrong channel for **Cloud**. Use the designated Cloud uploads channel.',
    );
  }

  try {
    validateSaveAttachment(save, edition);
  } catch (e: any) {
    errors.push(e?.message || 'Invalid save attachment.');
  }

  const content =
    errors.length === 0
      ? `${EMOJI_CONFIRM} PASS`
      : `${EMOJI_FAIL} FAIL\n${errors.map(e => `• ${e}`).join('\n')}`;

  await interaction.reply({ content, flags: MessageFlags.Ephemeral });
}

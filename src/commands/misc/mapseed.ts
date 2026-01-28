import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import { randomBytes } from 'node:crypto';

import { config } from '../../config.js';
import { EMOJI_ERROR, EMOJI_REPORT } from '../../config/constants.js';
import { ensureCommandAccess } from '../../utils/ensure-command-access.js';

const ACCESS_POLICY = {
  allowedChannelIds: [
    config.discord.channels.botTesting,
    config.discord.channels.civ6Commands,
    config.discord.channels.civ7Commands,
    config.discord.channels.cloudCommands,
  ],
  requiredRoleIds: [
    config.discord.roles.civ6Rank,
    config.discord.roles.civ7Rank,
    config.discord.roles.civCloud,
  ],
  allowDeveloperOverride: true,
} as const;

async function replyError(
  interaction: ChatInputCommandInteraction,
  content: string
): Promise<void> {
  const base = { content, allowedMentions: { parse: [] as const } } as const;

  if (interaction.deferred) {
    await interaction.editReply(base);
    return;
  }

  const payload = { ...base, flags: MessageFlags.Ephemeral } as const;
  if (interaction.replied) {
    await interaction.followUp(payload);
    return;
  }

  await interaction.reply(payload);
}

function int32Seed(): string {
  return String(randomBytes(4).readInt32BE(0));
}

export const data = new SlashCommandBuilder()
  .setName('mapseed')
  .setDescription('Generate a random Civilization map seed.')
  .addStringOption((opt) =>
    opt
      .setName('for')
      .setDescription('Optional game name (shown in the title).')
      .setMaxLength(120)
      .setRequired(false)
  );

export async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  try {
    if (!(await ensureCommandAccess(interaction, ACCESS_POLICY))) return;

    const label = interaction.options.getString('for')?.trim();
    const title = label
      ? `${EMOJI_REPORT} Random Map Seed for ${label}`
      : `${EMOJI_REPORT} Random Map Seed`;

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(int32Seed())
      .setColor(0xf85252);

    await interaction.reply({
      embeds: [embed],
      allowedMentions: { parse: [] },
    });
  } catch (err) {
    console.error('mapseed failed', {
      err,
      guildId: interaction.guildId ?? null,
      channelId: interaction.channelId,
      userId: interaction.user.id,
    });

    await replyError(
      interaction,
      `${EMOJI_ERROR} Something went wrong while generating a seed.`
    );
  }
}

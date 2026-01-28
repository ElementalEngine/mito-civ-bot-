import {
  ChannelType,
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

async function safeRespondError(
  interaction: ChatInputCommandInteraction,
  content: string
): Promise<void> {
  const base = { content, allowedMentions: { parse: [] as const } } as const;

  try {
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
  } catch {
    // swallow: interaction may already be acknowledged/expired
  }
}

function int32Seed(): string {
  // Signed 32-bit integer: [-2147483648, 2147483647]
  return String(randomBytes(4).readInt32BE(0));
}

export const data = new SlashCommandBuilder()
  .setName('mapseed')
  .setDescription('Generate a random Civilization map seed.')
  .addStringOption((opt) =>
    opt
      .setName('for')
      .setDescription('Optional game label (shown in the embed).')
      .setMaxLength(120)
      .setRequired(false)
  )
  .addUserOption((opt) =>
    opt
      .setName('tag')
      .setDescription('Optional user to include in the embed.')
      .setRequired(false)
  )
  .addChannelOption((opt) =>
    opt
      .setName('where')
      .setDescription('Optional channel or thread to include in the embed.')
      .addChannelTypes(
        ChannelType.GuildText,
        ChannelType.GuildAnnouncement,
        ChannelType.PublicThread,
        ChannelType.PrivateThread,
        ChannelType.AnnouncementThread
      )
      .setRequired(false)
  );

export async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  try {
    if (!(await ensureCommandAccess(interaction, ACCESS_POLICY))) return;
    await interaction.deferReply({ ephemeral: false });

    const label = interaction.options.getString('for')?.trim();
    const tagUser = interaction.options.getUser('tag');
    const where = interaction.options.getChannel('where');

    const lines: string[] = [int32Seed()];
    if (label) lines.push(`For: **${label}**`);
    if (tagUser) lines.push(`Tag: ${tagUser}`);
    if (where) lines.push(`Where: ${where}`);

    const embed = new EmbedBuilder()
      .setTitle(`${EMOJI_REPORT} Random Map Seed`)
      .setDescription(lines.join('\n'))
      .setColor(0xf85252);

    await interaction.editReply({ embeds: [embed], allowedMentions: { parse: [] } });
  } catch (err) {
    console.error('mapseed failed', {
      err,
      guildId: interaction.guildId ?? null,
      channelId: interaction.channelId,
      userId: interaction.user.id,
    });

    await safeRespondError(
      interaction,
      `${EMOJI_ERROR} Something went wrong while generating a seed.`
    );
  }
}

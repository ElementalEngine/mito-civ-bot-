import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import { randomInt } from 'node:crypto';

import { config } from '../../config.js';
import { EMOJI_ERROR, EMOJI_QUESTION } from '../../config/constants.js';
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

export const data = new SlashCommandBuilder()
  .setName('coinflip')
  .setDescription('Flip a coin.');

export async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  try {
    if (!(await ensureCommandAccess(interaction, ACCESS_POLICY))) return;

    const result = randomInt(0, 2) === 0 ? 'Heads' : 'Tails';

    const embed = new EmbedBuilder()
      .setTitle(`${EMOJI_QUESTION} Coin Flip`)
      .setDescription(`The coin landed on **${result}**!`)
      .setColor(0x00ff00);

    await interaction.reply({
      embeds: [embed],
      allowedMentions: { parse: [] },
    });
  } catch (err) {
    console.error('coinflip failed', {
      err,
      guildId: interaction.guildId ?? null,
      channelId: interaction.channelId,
      userId: interaction.user.id,
    });

    await replyError(
      interaction,
      `${EMOJI_ERROR} Something went wrong while flipping the coin.`
    );
  }
}

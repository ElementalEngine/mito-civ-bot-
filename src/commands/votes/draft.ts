import { SlashCommandBuilder, type ChatInputCommandInteraction, MessageFlags } from 'discord.js';

import { chunkByLength } from '../../utils/chunk-by-length';
import { MAX_DISCORD_LEN } from '../../config/constants';

import { addRepeatedStringOptions } from '../../utils/add-repeated-string-options';
import { generateDraft } from '../../services/draft.service';
import { renderDraftText } from '../../ui/drafts';

const MAX_LEADER_BANS_CIV6 = 15;
const MAX_LEADER_BANS_CIV7 = 15;
const MAX_CIV_BANS_CIV7 = 5;

function collectRepeatedStringOptions(
  interaction: ChatInputCommandInteraction,
  prefix: string,
  count: number
): string[] {
  const out: string[] = [];
  for (let i = 1; i <= count; i++) {
    const name = `${prefix}${i}`.toLowerCase();
    const v = interaction.options.getString(name);
    if (v) out.push(v);
  }
  return out;
}

export const data = (() => {
  const builder = new SlashCommandBuilder()
    .setName('draft')
    .setDescription('Generate a Civ 6/7 leader/civ draft.')
    .addStringOption((opt) =>
      opt
        .setName('game')
        .setDescription('Which game to draft for')
        .setRequired(true)
        .addChoices(
          { name: 'Civ 6', value: 'civ6' },
          { name: 'Civ 7', value: 'civ7' }
        )
    )
    .addStringOption((opt) =>
      opt
        .setName('gametype')
        .setDescription('FFA, Duel, or Teamer')
        .setRequired(true)
        .addChoices(
          { name: 'FFA', value: 'ffa' },
          { name: 'Duel', value: 'duel' },
          { name: 'Teamer', value: 'teamer' }
        )
    )
    .addIntegerOption((opt) =>
      opt
        .setName('count')
        .setDescription('Players (FFA/Duel) or teams (Teamer)')
        .setRequired(true)
        .setMinValue(2)
        .setMaxValue(14)
    )
    .addStringOption((opt) =>
      opt
        .setName('age')
        .setDescription('Civ 7 starting age (required for Civ 7)')
        .setRequired(false)
        .addChoices(
          { name: 'Antiquity', value: 'antiquity' },
          { name: 'Exploration', value: 'exploration' },
          { name: 'Modern', value: 'modern' }
        )
    );

  addRepeatedStringOptions(builder, {
    prefix: 'leaderban',
    count: 15,
    description: 'Leader ban (paste <:Name:ID> or :Name: or a lookup key)',
  });

  addRepeatedStringOptions(builder, {
    prefix: 'civban',
    count: 5,
    description: 'Civ ban (Civ 7 only) (paste <:Name:ID> or :Name: or a lookup key)',
  });

  return builder;
})();

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const game = interaction.options.getString('game', true) as 'civ6' | 'civ7';
  const gametype = interaction.options.getString('gametype', true) as 'ffa' | 'duel' | 'teamer';
  const count = interaction.options.getInteger('count', true);
  const age = interaction.options.getString('age') as 'antiquity' | 'exploration' | 'modern' | null;

  const leaderBanInputs = collectRepeatedStringOptions(
    interaction,
    'leaderban',
    game === 'civ6' ? MAX_LEADER_BANS_CIV6 : MAX_LEADER_BANS_CIV7
  );

  const civBanInputs =
    game === 'civ7' ? collectRepeatedStringOptions(interaction, 'civban', MAX_CIV_BANS_CIV7) : [];

  try {
    const draft = generateDraft({
      game,
      gametype,
      count,
      age: game === 'civ7' ? (age ?? undefined) : undefined,
      leaderBanInputs,
      civBanInputs,
    });

    const text = renderDraftText(draft);
    const chunks = Array.from(chunkByLength(text, MAX_DISCORD_LEN));

    await interaction.reply({ content: chunks[0] ?? 'Draft produced no output.', allowedMentions: { parse: [] } });
    for (let i = 1; i < chunks.length; i++) {
      await interaction.followUp({ content: chunks[i], allowedMentions: { parse: [] } });
    }
  } catch (err: any) {
    const msg = err?.message ? String(err.message) : 'Draft failed.';
    const content = `Draft error: ${msg}`.slice(0, MAX_DISCORD_LEN);

    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
    } else {
      await interaction.reply({ content, flags: MessageFlags.Ephemeral });
    }
  }
}

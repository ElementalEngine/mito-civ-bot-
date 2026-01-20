import type { SlashCommandOptionsOnlyBuilder, SlashCommandStringOption } from 'discord.js';

/**
 * Adds prefix1..prefixN optional string options (e.g. leaderban1..leaderban15)
 * while respecting Discord's 25-option limit.
 */
export function addRepeatedStringOptions<T extends SlashCommandOptionsOnlyBuilder>(
  builder: T,
  args: { prefix: string; count: number; description: string }
): T {
  const existing = builder.options?.length ?? 0;
  const available = 25 - existing;
  const max = Math.max(0, Math.min(args.count, available));

  for (let i = 1; i <= max; i++) {
    const name = `${args.prefix}${i}`.toLowerCase();
    builder.addStringOption((opt: SlashCommandStringOption) =>
      opt.setName(name).setDescription(`${args.description} #${i}`).setRequired(false)
    );
  }

  return builder;
}

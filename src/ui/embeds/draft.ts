import { EmbedBuilder } from 'discord.js';

import type { AgePool, CivMeta, LeaderMeta } from '../../data/index.js';
import { lookupCiv6LeaderMeta } from '../../data/civ6-data.js';
import { lookupCiv7CivMeta, lookupCiv7LeaderMeta } from '../../data/civ7-data.js';
import type { Civ6DraftResult, Civ7DraftResult, DraftGameType } from '../../services/draft.js';

type HasEmoji = (emojiId: string) => boolean;

export type BuildDraftEmbedOpts = Readonly<{
  hasEmojiId?: HasEmoji;
}>;

const EMOJI_NAME_SAFE_RE = /[^A-Za-z0-9_]/g;

function sanitizeEmojiName(name: string): string {
  const cleaned = name.replace(EMOJI_NAME_SAFE_RE, '_').replace(/_+/g, '_');
  const trimmed = cleaned.replace(/^_+|_+$/g, '');
  return trimmed.length >= 2 ? trimmed.slice(0, 32) : 'civ';
}

function renderEmoji(
  meta: Readonly<{ gameId: string; emojiId?: string }>,
  has?: HasEmoji
): string {
  const id = meta.emojiId?.trim();
  if (!id) return '';
  if (has && !has(id)) return '';
  return `<:${sanitizeEmojiName(meta.gameId)}:${id}>`;
}

function labelForGroup(kind: 'Player' | 'Team', idx: number): string {
  return kind === 'Team' ? `Team ${idx + 1}` : `Player ${idx + 1}`;
}

function formatHeader(args: Readonly<{
  game: 'civ6' | 'civ7';
  gameType: DraftGameType;
  startingAge?: AgePool;
  allocationNote?: string;
  leadersPerGroup: number;
  civsPerGroup?: number;
}>): string {
  const parts: string[] = [];
  if (args.game === 'civ6') {
    parts.push(`Game: **civ6** • Type: **${args.gameType}**`);
    parts.push(`Leaders: **${args.leadersPerGroup}** each`);
  } else {
    parts.push(
      `Game: **civ7** • Type: **${args.gameType}** • Age: **${args.startingAge ?? '—'}**`
    );
    parts.push(
      `Leaders/Civs: **${args.leadersPerGroup}** each`
    );
  }
  if (args.allocationNote) parts.push(`Note: ${args.allocationNote}`);
  return parts.join('\n');
}

function line(
  meta: Readonly<{ gameId: string; emojiId?: string }>,
  has?: HasEmoji
): string {
  const e = renderEmoji(meta, has);
  return e ? `${e} ${meta.gameId}` : meta.gameId;
}

function metaOrUnknown<T extends LeaderMeta | CivMeta>(
  meta: T | undefined
): Readonly<{ gameId: string; emojiId?: string }> {
  if (meta) return { gameId: meta.gameId, emojiId: meta.emojiId };
  return { gameId: 'Unknown' };
}

export function buildCiv6DraftEmbed(
  draft: Civ6DraftResult,
  opts: BuildDraftEmbedOpts = {}
): EmbedBuilder {
  const header = formatHeader({
    game: 'civ6',
    gameType: draft.gameType,
    leadersPerGroup: draft.allocation.leadersPerGroup,
    allocationNote: draft.allocation.note,
  });

  const lines: string[] = [header];
  for (let i = 0; i < draft.groups.length; i++) {
    lines.push('');
    lines.push(`**${labelForGroup(draft.allocation.groupKind, i)}**`);
    for (const k of draft.groups[i].leaders) {
      const meta = metaOrUnknown(lookupCiv6LeaderMeta(k));
      lines.push(line(meta, opts.hasEmojiId));
    }
  }

  return new EmbedBuilder()
    .setTitle('Draft')
    .setDescription(lines.join('\n'))
    .setColor(0x00ff00);
}

export function buildCiv7DraftEmbed(
  draft: Civ7DraftResult,
  opts: BuildDraftEmbedOpts = {}
): EmbedBuilder {
  const header = formatHeader({
    game: 'civ7',
    gameType: draft.gameType,
    startingAge: draft.startingAge,
    leadersPerGroup: draft.allocation.leadersPerGroup,
    civsPerGroup: draft.allocation.civsPerGroup,
    allocationNote: draft.allocation.note,
  });

  const lines: string[] = [header];

  for (let i = 0; i < draft.groups.length; i++) {
    const g = draft.groups[i];
    lines.push('');
    lines.push(`**${labelForGroup(draft.allocation.groupKind, i)}**`);
    lines.push('**Leaders**');
    for (const k of g.leaders) {
      const meta = metaOrUnknown(lookupCiv7LeaderMeta(k));
      lines.push(line(meta, opts.hasEmojiId));
    }
    lines.push('');
    lines.push('**Civs**');
    for (const k of g.civs ?? []) {
      const meta = metaOrUnknown(lookupCiv7CivMeta(k));
      lines.push(line(meta, opts.hasEmojiId));
    }
  }

  return new EmbedBuilder()
    .setTitle('Draft')
    .setDescription(lines.join('\n'))
    .setColor(0x00ff00);
}

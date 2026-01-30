import { randomInt } from 'node:crypto';

import type { AgePool, CivMeta, LeaderMeta } from '../data/index.js';
import { CIV6_LEADERS } from '../data/civ6-data.js';
import { CIV7_CIVS, CIV7_LEADERS } from '../data/civ7-data.js';

export type DraftGameType = 'FFA' | 'Teamer' | 'Duel';

export class DraftError extends Error {
  public readonly code: 'VALIDATION' | 'NO_POOL';

  public constructor(code: DraftError['code'], message: string) {
    super(message);
    this.name = 'DraftError';
    this.code = code;
  }
}

export type Civ6DraftRequest = Readonly<{
  gameType: DraftGameType;
  numberPlayers?: number;
  numberTeams?: number;
  leaderBansRaw?: string;
}>;

export type Civ7DraftRequest = Readonly<{
  gameType: DraftGameType;
  startingAge: AgePool;
  numberPlayers?: number;
  numberTeams?: number;
  leaderBansRaw?: string;
  civBansRaw?: string;
}>;

export type DraftGroupKind = 'Player' | 'Team';

export type DraftAllocation = Readonly<{
  groupKind: DraftGroupKind;
  groupCount: number;
  leadersPerGroup: number;
  civsPerGroup?: number;
  note?: string;
}>;

export type DraftGroup = Readonly<{
  leaders: readonly string[];
  civs?: readonly string[];
}>;

export type Civ6DraftResult = Readonly<{
  gameVersion: 'civ6';
  gameType: DraftGameType;
  allocation: DraftAllocation;
  groups: readonly DraftGroup[];
}>;

export type Civ7DraftResult = Readonly<{
  gameVersion: 'civ7';
  gameType: DraftGameType;
  startingAge: AgePool;
  allocation: DraftAllocation;
  groups: readonly DraftGroup[];
}>;

const MAX_CIV6_PLAYERS = 14;
const MAX_CIV7_PLAYERS = 10;
const MAX_TEAMS = 5;

const CIV6_DEFAULT_LEADERS_PER_GROUP = 5;
const CIV7_MAX_LEADERS_PER_GROUP = 3;

const EMOJI_MENTION_RE = /^<a?:[^:>]{2,32}:(\d{15,22})>$/;
const SNOWFLAKE_RE = /^\d{15,22}$/;

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function tokenizeBans(raw?: string): string[] {
  if (!raw) return [];
  const tokens = raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  // Also support pasting whitespace-separated emoji mentions/ids
  const expanded: string[] = [];
  for (const t of tokens) {
    const parts = t.split(/\s+/).filter(Boolean);
    expanded.push(...parts);
  }
  return expanded;
}

function normalizeToken(raw: string): string {
  const t = raw.trim();
  if (t.startsWith(':') && t.endsWith(':') && t.length > 2) {
    return t.slice(1, -1);
  }
  return t;
}

function buildLeaderBanIndex(
  leaders: Readonly<Record<string, LeaderMeta>>
): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  for (const [key, meta] of Object.entries(leaders)) {
    map.set(key.toLowerCase(), key);
    map.set(meta.gameId.toLowerCase(), key);
    const emojiId = meta.emojiId?.trim();
    if (emojiId && SNOWFLAKE_RE.test(emojiId)) map.set(emojiId, key);
  }
  return map;
}

function buildCivBanIndex(
  civs: Readonly<Record<string, CivMeta>>
): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  for (const [key, meta] of Object.entries(civs)) {
    map.set(key.toLowerCase(), key);
    map.set(meta.gameId.toLowerCase(), key);
    const emojiId = meta.emojiId?.trim();
    if (emojiId && SNOWFLAKE_RE.test(emojiId)) map.set(emojiId, key);
  }
  return map;
}

function resolveBanKeys(
  tokens: readonly string[],
  index: ReadonlyMap<string, string>,
  label: string
): Set<string> {
  const banned = new Set<string>();
  const unknown: string[] = [];

  for (const raw of tokens) {
    const token = normalizeToken(raw);
    const m = EMOJI_MENTION_RE.exec(token);
    const id = m?.[1] ?? (SNOWFLAKE_RE.test(token) ? token : null);
    const key = (id ? index.get(id) : undefined) ?? index.get(token.toLowerCase());
    if (!key) {
      unknown.push(token);
      continue;
    }
    banned.add(key);
  }

  if (unknown.length > 0) {
    const shown = unknown.slice(0, 5).join(', ');
    const suffix = unknown.length > 5 ? ` (+${unknown.length - 5} more)` : '';
    throw new DraftError('VALIDATION', `Unknown ${label} ban(s): ${shown}${suffix}`);
  }
  return banned;
}

function computeLayout(args: Readonly<{
  gameVersion: 'civ6' | 'civ7';
  gameType: DraftGameType;
  numberPlayers?: number;
  numberTeams?: number;
}>): Readonly<{ groupKind: DraftGroupKind; groupCount: number }> {
  const { gameVersion, gameType, numberPlayers, numberTeams } = args;

  const maxPlayers = gameVersion === 'civ6' ? MAX_CIV6_PLAYERS : MAX_CIV7_PLAYERS;

  if (gameType === 'FFA') {
    if (numberTeams !== undefined) {
      throw new DraftError(
        'VALIDATION',
        'For FFA, use number-players (do not provide number-teams).'
      );
    }
    if (numberPlayers === undefined) {
      throw new DraftError('VALIDATION', 'For FFA, number-players is required.');
    }
    if (numberPlayers < 2 || numberPlayers > maxPlayers) {
      throw new DraftError(
        'VALIDATION',
        `For FFA, number-players must be between 2 and ${maxPlayers}.`
      );
    }
    return { groupKind: 'Player', groupCount: numberPlayers };
  }

  if (gameType === 'Teamer') {
    if (numberPlayers !== undefined) {
      throw new DraftError(
        'VALIDATION',
        'For Teamer, use number-teams (do not provide number-players).'
      );
    }
    if (numberTeams === undefined) {
      throw new DraftError('VALIDATION', 'For Teamer, number-teams is required.');
    }
    if (numberTeams < 2 || numberTeams > MAX_TEAMS) {
      throw new DraftError(
        'VALIDATION',
        `For Teamer, number-teams must be between 2 and ${MAX_TEAMS}.`
      );
    }
    return { groupKind: 'Team', groupCount: numberTeams };
  }

  // Duel
  if (numberPlayers !== undefined || numberTeams !== undefined) {
    throw new DraftError(
      'VALIDATION',
      'For Duel, do not provide number-players or number-teams.'
    );
  }
  return { groupKind: 'Player', groupCount: 2 };
}

function dealUnique(pool: string[], count: number): string[] {
  return pool.splice(0, count);
}

function pickDistinct<T>(pool: readonly T[], count: number): T[] {
  if (count <= 0) return [];
  const copy = pool.slice();
  shuffle(copy);
  return copy.slice(0, count);
}

export function generateCiv6Draft(req: Civ6DraftRequest): Civ6DraftResult {
  const { groupKind, groupCount } = computeLayout({
    gameVersion: 'civ6',
    gameType: req.gameType,
    numberPlayers: req.numberPlayers,
    numberTeams: req.numberTeams,
  });

  const leaderIndex = buildLeaderBanIndex(CIV6_LEADERS);
  const banned = resolveBanKeys(tokenizeBans(req.leaderBansRaw), leaderIndex, 'leader');

  const allLeaderKeys = Object.keys(CIV6_LEADERS);
  const available = allLeaderKeys.filter((k) => !banned.has(k));
  const leadersPerGroup = Math.min(
    CIV6_DEFAULT_LEADERS_PER_GROUP,
    Math.floor(available.length / groupCount)
  );

  if (leadersPerGroup < 1) {
    throw new DraftError(
      'NO_POOL',
      `Not enough leaders for ${groupCount} ${groupKind.toLowerCase()}s after bans. Remove bans or reduce players/teams.`
    );
  }

  const note =
    leadersPerGroup < CIV6_DEFAULT_LEADERS_PER_GROUP
      ? `${leadersPerGroup} leader(s) each due to pool size/bans.`
      : undefined;

  shuffle(available);

  const groups: DraftGroup[] = [];
  for (let i = 0; i < groupCount; i++) {
    groups.push({ leaders: dealUnique(available, leadersPerGroup) });
  }

  return {
    gameVersion: 'civ6',
    gameType: req.gameType,
    allocation: { groupKind, groupCount, leadersPerGroup, note },
    groups,
  };
}

export function generateCiv7Draft(req: Civ7DraftRequest): Civ7DraftResult {
  const { groupKind, groupCount } = computeLayout({
    gameVersion: 'civ7',
    gameType: req.gameType,
    numberPlayers: req.numberPlayers,
    numberTeams: req.numberTeams,
  });

  const leaderIndex = buildLeaderBanIndex(CIV7_LEADERS);
  const civIndex = buildCivBanIndex(CIV7_CIVS);

  const bannedLeaders = resolveBanKeys(
    tokenizeBans(req.leaderBansRaw),
    leaderIndex,
    'leader'
  );
  const bannedCivs = resolveBanKeys(tokenizeBans(req.civBansRaw), civIndex, 'civ');

  const allLeaderKeys = Object.keys(CIV7_LEADERS);
  const leaderPool = allLeaderKeys.filter((k) => !bannedLeaders.has(k));

  const baseLeadersPerGroup = Math.min(
    CIV7_MAX_LEADERS_PER_GROUP,
    Math.floor(leaderPool.length / groupCount)
  );
  if (baseLeadersPerGroup < 1) {
    throw new DraftError(
      'NO_POOL',
      `Not enough leaders for ${groupCount} ${groupKind.toLowerCase()}s after bans. Remove bans or reduce players/teams.`
    );
  }

  const civPool = Object.entries(CIV7_CIVS)
    .filter(([key, meta]) => meta.agePool === req.startingAge && !bannedCivs.has(key))
    .map(([key]) => key);

  if (civPool.length < 1) {
    throw new DraftError(
      'NO_POOL',
      `No civs available for ${req.startingAge} after bans. Remove civ bans or pick a different age.`
    );
  }

  // Civs may duplicate across groups, but we keep them distinct within a group.
  const leadersPerGroup = Math.min(baseLeadersPerGroup, civPool.length);
  if (leadersPerGroup < 1) {
    throw new DraftError(
      'NO_POOL',
      `Not enough civs available for ${req.startingAge} to match leader allocation. Remove civ bans or pick a different age.`
    );
  }
  const civsPerGroup = leadersPerGroup;

  const noteParts: string[] = [];
  if (leadersPerGroup < CIV7_MAX_LEADERS_PER_GROUP) {
    noteParts.push(`${leadersPerGroup} leader(s) each due to pool size/bans.`);
  }
  if (leadersPerGroup < baseLeadersPerGroup) {
    noteParts.push('Adjusted to match civ pool size.');
  }
  const note = noteParts.length > 0 ? noteParts.join(' ') : undefined;

  shuffle(leaderPool);
  const groups: DraftGroup[] = [];
  for (let i = 0; i < groupCount; i++) {
    const leaders = dealUnique(leaderPool, leadersPerGroup);
    const civs = pickDistinct(civPool, civsPerGroup);
    groups.push({ leaders, civs });
  }

  return {
    gameVersion: 'civ7',
    gameType: req.gameType,
    startingAge: req.startingAge,
    allocation: { groupKind, groupCount, leadersPerGroup, civsPerGroup, note },
    groups,
  };
}

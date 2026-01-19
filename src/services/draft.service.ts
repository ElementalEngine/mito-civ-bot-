import { normalizeBanTokenToName } from '../utils/emoji';

import { CIV6_LEADERS, lookupCiv6Leader } from '../data/civ6-leaders';
import { CIV7_LEADERS, CIV7_LEADER_AGE_POOL, lookupCiv7Leader } from '../data/civ7-leaders';
import { CIV7_CIVS, CIV7_CIV_AGE_POOL, lookupCiv7Civ, type Civ7Age } from '../data/civ7-civs';

const randInt = (maxExclusive: number): number => {
  if (maxExclusive <= 0) throw new Error('randInt maxExclusive must be > 0');
  return Math.floor(Math.random() * maxExclusive);
};

export type DraftGame = 'civ6' | 'civ7';
export type DraftGameType = 'ffa' | 'duel' | 'teamer';
export type DraftParticipantLabel = `Player ${number}` | `Team ${number}`;

export type DraftInput = {
  game: DraftGame;
  gametype: DraftGameType;
  /** Players (FFA/Duel) OR teams (Teamer). */
  count: number;
  /** Civ 7 only. Required for Civ 7. */
  age?: Civ7Age;
  leaderBanInputs: string[];
  civBanInputs?: string[];
};

export type Civ6Draft = {
  game: 'civ6';
  gametype: DraftGameType;
  count: number;
  leadersPerParticipant: number;
  bans: { leaders: string[] };
  participants: Array<{ label: DraftParticipantLabel; leaders: string[] }>;
};

export type Civ7Draft = {
  game: 'civ7';
  gametype: DraftGameType;
  count: number;
  age: Civ7Age;
  leadersPerParticipant: number;
  civsPerParticipant: number;
  bans: { leaders: string[]; civs: string[] };
  participants: Array<{ label: DraftParticipantLabel; leaders: string[]; civs: string[] }>;
};

export type DraftResult = Civ6Draft | Civ7Draft;

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function labelsFor(gametype: DraftGameType, count: number): DraftParticipantLabel[] {
  const prefix = gametype === 'teamer' ? 'Team' : 'Player';
  return Array.from({ length: count }, (_, i) => `${prefix} ${i + 1}` as DraftParticipantLabel);
}

function assertCount(game: DraftGame, gametype: DraftGameType, count: number): void {
  if (!Number.isInteger(count) || count <= 0) throw new Error('count must be a positive integer');

  if (game === 'civ6') {
    if (gametype === 'ffa' && (count < 3 || count > 14)) throw new Error('Civ 6 FFA must be 3–14 players.');
    if (gametype === 'duel' && count !== 2) throw new Error('Civ 6 Duel must be exactly 2 players.');
    if (gametype === 'teamer' && ![2, 3, 4, 5].includes(count)) throw new Error('Civ 6 Teamer must be 2–5 teams.');
    return;
  }

  if (gametype === 'ffa' && (count < 3 || count > 10)) throw new Error('Civ 7 FFA must be 3–10 players.');
  if (gametype === 'duel' && count !== 2) throw new Error('Civ 7 Duel must be exactly 2 players.');
  if (gametype === 'teamer' && ![2, 3, 4, 5].includes(count)) throw new Error('Civ 7 Teamer must be 2–5 teams.');
}

function resolveBans(args: {
  tokens: string[];
  lookup: (key: string) => string;
  /** Validate against the full game list (not the filtered pool). */
  allowed: ReadonlySet<string>;
  label: string;
}): string[] {
  const invalid: string[] = [];
  const resolvedOrdered: string[] = [];
  const seen = new Set<string>();

  for (const t of args.tokens) {
    const raw = t.trim();
    if (!raw) continue;

    const nameOrKey = normalizeBanTokenToName(raw);
    if (!nameOrKey) continue;

    const resolved = args.lookup(nameOrKey);
    if (!args.allowed.has(resolved)) {
      invalid.push(t);
      continue;
    }

    if (!seen.has(resolved)) {
      seen.add(resolved);
      resolvedOrdered.push(resolved);
    }
  }

  if (invalid.length) {
    const preview = invalid.slice(0, 8).join(', ');
    const more = invalid.length > 8 ? ` (and ${invalid.length - 8} more)` : '';
    throw new Error(`Unknown ${args.label} ban(s): ${preview}${more}`);
  }

  return resolvedOrdered;
}

function leadersPerParticipant(args: {
  gametype: DraftGameType;
  participants: number;
  poolSize: number;
  cap: number;
}): number {
  if (args.gametype === 'duel') return args.cap;
  return Math.min(args.cap, Math.floor(args.poolSize / args.participants));
}

function dealNoRepeat(pool: string[], participants: number, per: number): string[][] {
  const copy = pool.slice();
  shuffle(copy);

  const need = participants * per;
  if (copy.length < need) throw new Error('Not enough unique items to deal without repeats.');

  const out: string[][] = Array.from({ length: participants }, () => []);
  let idx = 0;

  for (let p = 0; p < participants; p++) {
    for (let k = 0; k < per; k++) {
      out[p].push(copy[idx++]);
    }
  }

  return out;
}

function sampleUnique(pool: string[], count: number): string[] {
  if (count <= 0) return [];
  if (count >= pool.length) return pool.slice();

  const copy = pool.slice();
  shuffle(copy);
  return copy.slice(0, count);
}

function civ7CivPoolForAge(age: Civ7Age): string[] {
  const all = Object.values(CIV7_CIVS);
  const map = CIV7_CIV_AGE_POOL as Partial<Record<string, Civ7Age>>;
  // Only civs mapped into the selected age are draftable.
  return all.filter((c) => map[c] === age);
}

function civ7LeaderPoolForAge(age: Civ7Age): string[] {
  const all = Object.values(CIV7_LEADERS);
  const map = CIV7_LEADER_AGE_POOL as Partial<Record<string, Civ7Age>>;
  // If no mapping provided, treat all leaders as available.
  if (Object.keys(map).length === 0) return all;

  // Safer default while you're filling age pools:
  // - if a leader is mapped, enforce it
  // - if a leader is not mapped, allow it in every age
  return all.filter((l) => map[l] == null || map[l] === age);
}

export function generateDraft(input: DraftInput): DraftResult {
  assertCount(input.game, input.gametype, input.count);

  if (input.game === 'civ7') {
    if (!input.age) throw new Error('Civ 7 drafts require an age (Antiquity / Exploration / Modern).');
  }

  // --- Leaders (no repeats) ---
  const allLeaderValues =
    input.game === 'civ6'
      ? Object.values(CIV6_LEADERS)
      : Object.values(CIV7_LEADERS);

  const leaderPoolBase =
    input.game === 'civ6'
      ? allLeaderValues
      : civ7LeaderPoolForAge(input.age!);

  // Validate bans against the full game's leader list (forgiving UX).
  const leaderAllowed = new Set<string>(allLeaderValues);
  const leaderLookup = input.game === 'civ6' ? lookupCiv6Leader : lookupCiv7Leader;

  const leaderBans = resolveBans({
    tokens: input.leaderBanInputs,
    lookup: leaderLookup,
    allowed: leaderAllowed,
    label: 'leader',
  });

  const leaderBanSet = new Set(leaderBans);
  const leaderPool = leaderPoolBase.filter((l) => !leaderBanSet.has(l));

  const leaderPer = leadersPerParticipant({
    gametype: input.gametype,
    participants: input.count,
    poolSize: leaderPool.length,
    cap: 6,
  });

  if (leaderPer <= 0) throw new Error('Leader pool too small for this draft configuration.');
  if (input.gametype === 'duel' && leaderPool.length < input.count * leaderPer) {
    throw new Error('Not enough leaders available to draft 6 per player for Duel.');
  }

  const leaderDeals = dealNoRepeat(leaderPool, input.count, leaderPer);

  // --- Civ 6 output ---
  if (input.game === 'civ6') {
    const labels = labelsFor(input.gametype, input.count);
    return {
      game: 'civ6',
      gametype: input.gametype,
      count: input.count,
      leadersPerParticipant: leaderPer,
      bans: { leaders: leaderBans },
      participants: labels.map((label, idx) => ({ label, leaders: leaderDeals[idx] })),
    };
  }

  // --- Civ 7 civs (may repeat across participants) ---
  const allCivValues = Object.values(CIV7_CIVS);
  const civValues = civ7CivPoolForAge(input.age!);
  if (civValues.length === 0) {
    throw new Error(`No Civ 7 civs configured for age: ${input.age!}`);
  }

  // Validate bans against the full civ list (forgiving UX).
  const civAllowed = new Set<string>(allCivValues);
  const civBans = resolveBans({
    tokens: input.civBanInputs ?? [],
    lookup: lookupCiv7Civ,
    allowed: civAllowed,
    label: 'civ',
  });

  const civBanSet = new Set(civBans);
  const civPool = civValues.filter((c) => !civBanSet.has(c));
  if (civPool.length === 0) throw new Error('Civ pool is empty after applying age filter and bans.');

  const civPer = Math.min(4, civPool.length);
  const civDeals = Array.from({ length: input.count }, () => sampleUnique(civPool, civPer));

  const labels = labelsFor(input.gametype, input.count);
  return {
    game: 'civ7',
    gametype: input.gametype,
    count: input.count,
    age: input.age!,
    leadersPerParticipant: leaderPer,
    civsPerParticipant: civPer,
    bans: { leaders: leaderBans, civs: civBans },
    participants: labels.map((label, idx) => ({
      label,
      leaders: leaderDeals[idx],
      civs: civDeals[idx],
    })),
  };
}

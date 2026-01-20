import { formatCustomEmoji } from '../utils/emoji';

import { CIV6_LEADER_EMOJI_IDS } from '../data/civ6-leaders';
import { CIV7_LEADER_EMOJI_IDS } from '../data/civ7-leaders';
import { CIV7_CIV_EMOJI_IDS } from '../data/civ7-civs';

import type { DraftResult } from '../services/draft.service';

type EmojiIdMap = Readonly<Record<string, string | undefined>>;

function capWord(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

function fmtItem(name: string, emojiIds: EmojiIdMap): string {
  return `${name} ${formatCustomEmoji({ emojiName: name, emojiId: emojiIds[name] })}`;
}

function fmtList(items: string[], emojiIds: EmojiIdMap): string {
  return items.map((n) => fmtItem(n, emojiIds)).join('\n');
}

function fmtBans(items: string[], emojiIds: EmojiIdMap): string {
  return items.length ? items.map((n) => fmtItem(n, emojiIds)).join(', ') : 'None';
}

export function renderDraftText(draft: DraftResult): string {
  if (draft.game === 'civ6') {
    const unit = draft.gametype === 'teamer' ? 'teams' : 'players';
    const header = `Draft — Civ 6 (${draft.gametype.toUpperCase()}, ${draft.count} ${unit})`;
    const bans = `Bans: ${fmtBans(draft.bans.leaders, CIV6_LEADER_EMOJI_IDS)}`;

    const body = draft.participants
      .map((p) => `${p.label}\n${fmtList(p.leaders, CIV6_LEADER_EMOJI_IDS)}`)
      .join('\n\n');

    return `${header}\n${bans}\n\n${body}`;
  }

  const unit = draft.gametype === 'teamer' ? 'teams' : 'players';
  const header = `Draft — Civ 7 (${draft.gametype.toUpperCase()}, ${capWord(draft.age)}, ${draft.count} ${unit})`;
  const bansLeaders = `Leader bans: ${fmtBans(draft.bans.leaders, CIV7_LEADER_EMOJI_IDS)}`;
  const bansCivs = `Civ bans: ${fmtBans(draft.bans.civs, CIV7_CIV_EMOJI_IDS)}`;

  const body = draft.participants
    .map((p) => {
      const leaders = fmtList(p.leaders, CIV7_LEADER_EMOJI_IDS);
      const civs = fmtList(p.civs, CIV7_CIV_EMOJI_IDS);
      return `${p.label}\nLeaders\n${leaders}\n\nCivs\n${civs}`;
    })
    .join('\n\n');

  return `${header}\n${bansLeaders}\n${bansCivs}\n\n${body}`;
}

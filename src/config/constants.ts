// ── Mentions 
export const MAX_MENTIONS = 14 as const;

// ── Emojis 
export const EMOJI_YES           = '👍';
export const EMOJI_NO            = '👎';
export const EMOJI_QUESTION      = '❓';
export const EMOJI_CANCEL        = '❌';
export const EMOJI_CONFIRM       = '✅';
export const EMOJI_ERROR         = '⚠️';
export const EMOJI_FAIL          = '‼️';
export const EMOJI_PARTICIPANTS  = '👥';
export const EMOJI_FULL_G_REPORT = '📜';

// ── Civilization save rules 
export const CIV_SAVE = {
  EXT: {
    CIV6: '.civ6save',
    CIV7: '.civ7save',
  },
  MAX_BYTES: 7 * 1024 * 1024, // 7 MB
} as const;

export type CivEdition = keyof typeof CIV_SAVE.EXT; // 'CIV6' | 'CIV7'
export const expectedExt = (edition: CivEdition) => CIV_SAVE.EXT[edition];
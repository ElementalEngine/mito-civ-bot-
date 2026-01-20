const CUSTOM_EMOJI_RE = /<a?:([A-Za-z0-9_]+):(\d+)>/;

export function extractEmojiNameFromMention(token: string): string | null {
  const m = token.match(CUSTOM_EMOJI_RE);
  return m?.[1] ?? null;
}

export function normalizeBanTokenToName(token: string): string {
  const trimmed = token.trim();
  if (!trimmed) return '';

  const fromMention = extractEmojiNameFromMention(trimmed);
  const base = (fromMention ?? trimmed).trim();

  // Strip leading/trailing colons so `:RomeTrajan:` and `::RomeTrajan::` work.
  return base.replace(/^:+|:+$/g, '');
}

export function formatCustomEmoji(args: { emojiName?: string; emojiId?: string }): string {
  const { emojiName, emojiId } = args;
  if (emojiName && emojiId) return `<:${emojiName}:${emojiId}>`;
  if (emojiName) return `:${emojiName}:`;
  return '❓';
}

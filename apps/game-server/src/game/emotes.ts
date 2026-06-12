const allowedEmotes = new Set(["😂", "🔥", "👏", "🤨", "🥚"]);

export function isAllowedEmote(emoji: string): boolean {
  return allowedEmotes.has(emoji);
}

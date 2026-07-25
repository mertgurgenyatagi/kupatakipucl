import { Player } from "../profile/usePlayers";

export interface MentionQuery {
  /** Text typed after "@", not yet including it. */
  query: string;
  /** Index of the "@" character itself within the full text. */
  start: number;
}

/**
 * Finds an in-progress "@word" token immediately before the cursor, e.g.
 * "hey @ad|" (cursor at |) -> { query: "ad", start: 4 }. Returns null once
 * the token is broken by whitespace, or "@" isn't at the very start of a
 * word (so "a@b" doesn't trigger mid-word).
 */
export function findActiveMentionQuery(text: string, cursor: number): MentionQuery | null {
  const upToCursor = text.slice(0, cursor);
  const at = upToCursor.lastIndexOf("@");
  if (at === -1) return null;

  const between = upToCursor.slice(at + 1);
  if (/\s/.test(between)) return null;
  if (at > 0 && /\S/.test(upToCursor[at - 1])) return null;

  return { query: between, start: at };
}

/** Players whose first name starts with `query` (case-insensitive), for the
 *  composer's autocomplete dropdown. */
export function matchMentionCandidates(players: Player[], query: string, max = 5): Player[] {
  const q = query.toLowerCase();
  return players.filter((p) => p.firstName.toLowerCase().startsWith(q)).slice(0, max);
}

/** Replaces the in-progress "@word" token with "@FirstName " and reports
 *  where the cursor should land afterward. */
export function insertMention(
  text: string,
  mention: MentionQuery,
  cursor: number,
  player: Player
): { text: string; cursor: number } {
  const before = text.slice(0, mention.start);
  const after = text.slice(cursor);
  const inserted = `@${player.firstName} `;
  return { text: before + inserted + after, cursor: (before + inserted).length };
}

export interface MentionSegment {
  text: string;
  isMention: boolean;
}

/** Splits message text into plain/mention segments for cosmetic
 *  highlighting — only "@Word" tokens that actually match a real player's
 *  first name light up, so a stray "@" in normal prose doesn't. */
export function splitMentionSegments(text: string, players: Player[]): MentionSegment[] {
  const names = new Set(players.map((p) => p.firstName.toLowerCase()));
  return text
    .split(/(@[\p{L}\d_]+)/gu)
    .filter((part) => part.length > 0)
    .map((part) => ({
      text: part,
      isMention: part.startsWith("@") && names.has(part.slice(1).toLowerCase()),
    }));
}

/** Every uid whose first name is @mentioned anywhere in `text`, deduped.
 *  Computed at send time from the text itself, so it works the same whether
 *  a mention was picked from the dropdown or just typed by hand. */
export function resolveMentionedUids(text: string, players: Player[]): string[] {
  const mentionedNames = new Set(
    splitMentionSegments(text, players)
      .filter((segment) => segment.isMention)
      .map((segment) => segment.text.slice(1).toLowerCase())
  );
  if (mentionedNames.size === 0) return [];

  const uids = new Set<string>();
  players.forEach((p) => {
    if (mentionedNames.has(p.firstName.toLowerCase())) uids.add(p.uid);
  });
  return Array.from(uids);
}

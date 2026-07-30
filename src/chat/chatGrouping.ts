import { MessageWithId } from "./useMessages";

// chat-widget-round-01 Q3/Q4: "function like WhatsApp or an Instagram chat"
// — date dividers plus consecutive-message grouping (same sender, no more
// than this many minutes apart) so a run of messages from one person reads
// as one block instead of repeating their name/avatar every line.
const GROUP_WINDOW_MS = 5 * 60_000;

/**
 * Anything the chat list can render: a plain message, or a lobby system
 * message ("Grup oluşturuldu.", "X katıldı."). Kept structural (`system?:
 * unknown`) rather than importing LobbySystemInfo — lobbyTypes.ts already
 * imports from src/chat, so the reverse edge would be a module cycle.
 */
export type GroupableMessage = MessageWithId & { system?: unknown };

export type ChatItem<T extends GroupableMessage = MessageWithId> =
  | { type: "divider"; key: string; label: string }
  | { type: "message"; key: string; message: T; showHeader: boolean };

function startOfDay(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function dateDividerLabel(createdAt: number, now: number = Date.now()): string {
  const diffDays = Math.round((startOfDay(now) - startOfDay(createdAt)) / 86_400_000);
  if (diffDays === 0) return "Bugün";
  if (diffDays === 1) return "Dün";
  const d = new Date(createdAt);
  const sameYear = d.getFullYear() === new Date(now).getFullYear();
  return d.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: sameYear ? undefined : "numeric",
  });
}

export function formatMessageTime(createdAt: number): string {
  return new Date(createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

export function shouldGroupWithPrevious(current: GroupableMessage, previous: GroupableMessage): boolean {
  // A system message never continues into the next message's group, even
  // though it carries the acting user's own uid. Every new lobby opens with
  // a "Grup oluşturuldu." authored by the creator, and every join adds an
  // "X katıldı." authored by the joiner — without this, that person's first
  // real message right afterwards lost its avatar and name, because it read
  // as a continuation of a line that renders as neither (2026-07-30,
  // final-review fix). A system message itself renders as a centered line
  // with no header, so its own grouping flag is moot.
  if (previous.system) return false;
  return (
    current.uid === previous.uid &&
    startOfDay(current.createdAt) === startOfDay(previous.createdAt) &&
    current.createdAt - previous.createdAt < GROUP_WINDOW_MS
  );
}

/** Chronological messages -> a flat render list of date dividers and
 *  messages, each message flagged with whether it starts a new visual group
 *  (shows avatar/name) or continues the previous sender's run. */
export function buildChatItems<T extends GroupableMessage>(messages: T[], now: number = Date.now()): ChatItem<T>[] {
  const items: ChatItem<T>[] = [];
  let previous: T | null = null;

  for (const message of messages) {
    if (!previous || startOfDay(message.createdAt) !== startOfDay(previous.createdAt)) {
      items.push({
        type: "divider",
        key: `divider-${startOfDay(message.createdAt)}`,
        label: dateDividerLabel(message.createdAt, now),
      });
    }

    items.push({
      type: "message",
      key: message.id,
      message,
      showHeader: !previous || !shouldGroupWithPrevious(message, previous),
    });

    previous = message;
  }

  return items;
}

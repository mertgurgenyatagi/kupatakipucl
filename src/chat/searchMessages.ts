import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import { Message } from "./messageTypes";
import { MessageWithId } from "./useMessages";

/**
 * How far back search reaches. Bounded on 2026-08-07 (scaling-250 design spec
 * §3) — this was the only query in the app unbounded in time.
 */
export const SEARCH_WINDOW = 2000;

/**
 * chat-widget-round-01 Q22: search is worth having since /chat's deletion
 * leaves no fuller page to defer it to, but there's no real search index
 * behind it — Firestore has no substring query, so this remains a fetch plus
 * a client-side filter rather than a real search backend. Only the fetch is
 * now bounded.
 *
 * It used to fetch the entire collection, justified as "this app's whole
 * history is small enough (a friend-group season, not a public product)" — an
 * assumption 250 participants retires. At even 150 messages/day across a
 * September-May season that is ~40,000 documents per search click, multiple
 * megabytes parsed on the main thread, growing every day and recurring on
 * every search.
 *
 * Accepted trade-off, Mert's call on 2026-08-07: a message older than the
 * window is not findable. That matches how the forum already behaves —
 * usePosts' search only filters what has been paged in.
 *
 * Split into two pieces (not-started-audit item 18) so ChatRoom.tsx can
 * fetch once per search session and filter every keystroke against that
 * same in-memory list, instead of re-running a full collection fetch on
 * every debounced keystroke. `searchMessages` composes both, kept as the
 * simple one-shot entry point these existing tests already cover.
 *
 * `lobbyId` scopes the fetch to one lobby's own messages subcollection.
 * special-lobby-round-7 Q2 locks search to "confined to the current view —
 * search General, or search one lobby, never mixed", so this is a switch
 * between two collections, never a union of both (2026-07-30,
 * final-review fix).
 */
export async function fetchRecentMessagesForSearch(
  lobbyId: string | null = null
): Promise<MessageWithId[]> {
  const messagesRef = lobbyId ? collection(db, "lobbies", lobbyId, "messages") : collection(db, "messages");
  const messagesQuery = query(messagesRef, orderBy("createdAt", "desc"), limit(SEARCH_WINDOW));
  const snapshot = await getDocs(messagesQuery);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Message) }));
}

export function filterMessagesByTerm(messages: MessageWithId[], term: string): MessageWithId[] {
  const trimmed = term.trim().toLowerCase();
  if (!trimmed) return [];
  return messages.filter((message) => !message.deleted && message.text.toLowerCase().includes(trimmed));
}

export async function searchMessages(term: string, lobbyId: string | null = null): Promise<MessageWithId[]> {
  const trimmed = term.trim();
  if (!trimmed) return [];
  const all = await fetchRecentMessagesForSearch(lobbyId);
  return filterMessagesByTerm(all, trimmed);
}

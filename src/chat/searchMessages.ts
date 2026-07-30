import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import { Message } from "./messageTypes";
import { MessageWithId } from "./useMessages";

/**
 * chat-widget-round-01 Q22: search is worth having since /chat's deletion
 * leaves no fuller page to defer it to, but there's no real search index
 * behind it — Firestore has no substring query, and this app's whole
 * history is small enough (a friend-group season, not a public product)
 * that a one-time full fetch + client-side filter is the honest, simple
 * option rather than standing up a real search backend.
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
export async function fetchAllMessagesForSearch(lobbyId: string | null = null): Promise<MessageWithId[]> {
  const messagesRef = lobbyId ? collection(db, "lobbies", lobbyId, "messages") : collection(db, "messages");
  const messagesQuery = query(messagesRef, orderBy("createdAt", "desc"));
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
  const all = await fetchAllMessagesForSearch(lobbyId);
  return filterMessagesByTerm(all, trimmed);
}

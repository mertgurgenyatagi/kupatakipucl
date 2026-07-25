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
 * option rather than standing up a real search backend. Deliberately a
 * one-time getDocs, not a live listener — only runs when the widget's
 * search bar is actually opened (ChatRoom.tsx), not on every Home load.
 */
export async function searchMessages(term: string): Promise<MessageWithId[]> {
  const trimmed = term.trim().toLowerCase();
  if (!trimmed) return [];

  const messagesQuery = query(collection(db, "messages"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(messagesQuery);
  return snapshot.docs
    .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Message) }))
    .filter((message) => !message.deleted && message.text.toLowerCase().includes(trimmed));
}

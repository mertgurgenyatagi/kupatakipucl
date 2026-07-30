import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Soft-delete: flips `deleted` to true and leaves everything else alone.
 * firestore.rules enforces both that this is the message's own sender and
 * that `deleted` is the only field this write can touch (chat-widget-round-01
 * Q16 — reverses this collection's original "no edits or deletes, ever"
 * stance; see firestore.rules for the full note).
 *
 * `lobbyId` picks the lobby's own messages subcollection instead of the
 * global one. Without it a lobby message was updated at /messages/{id},
 * a path where that doc simply doesn't exist, so every in-lobby delete
 * failed with the generic error (2026-07-30, final-review fix).
 */
export async function deleteMessage(messageId: string, lobbyId: string | null = null): Promise<void> {
  const ref = lobbyId ? doc(db, "lobbies", lobbyId, "messages", messageId) : doc(db, "messages", messageId);
  await updateDoc(ref, { deleted: true });
}

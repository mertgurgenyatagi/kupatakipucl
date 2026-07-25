import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Soft-delete: flips `deleted` to true and leaves everything else alone.
 * firestore.rules enforces both that this is the message's own sender and
 * that `deleted` is the only field this write can touch (chat-widget-round-01
 * Q16 — reverses this collection's original "no edits or deletes, ever"
 * stance; see firestore.rules for the full note).
 */
export async function deleteMessage(messageId: string): Promise<void> {
  await updateDoc(doc(db, "messages", messageId), { deleted: true });
}

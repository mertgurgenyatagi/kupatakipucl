// src/lobbies/deleteLobby.ts
import { collection, doc, getDocs, writeBatch } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Firestore allows at most 20 rules-access calls (get/exists/getAfter) per
 * BATCHED WRITE — a separate, far lower ceiling than the 500-operation batch
 * size limit. Deleting a member doc that isn't your own evaluates
 * `get(/lobbies/{lobbyId})` in firestore.rules (only the creator's own doc
 * short-circuits on `request.auth.uid == uid`), so a single batch covering
 * every member of a ~20-person lobby blew that budget and failed the whole
 * delete. Nothing caps lobby size — the 3-lobby limits are per user, not per
 * lobby — so this has to chunk. 15 leaves headroom under the 20
 * (2026-07-30, final-review fix).
 */
export const DELETE_LOBBY_MEMBER_CHUNK_SIZE = 15;

export async function deleteLobby(lobbyId: string): Promise<void> {
  const membersSnap = await getDocs(collection(db, "lobbies", lobbyId, "members"));
  const memberRefs = membersSnap.docs.map((memberDoc) => memberDoc.ref);

  // Sequential, not Promise.all: the lobby doc goes in the final batch, and
  // once it's gone the member-delete rule's get() on it fails, so any batch
  // still in flight would be denied. Ordering is the whole point here.
  for (let i = 0; i < memberRefs.length; i += DELETE_LOBBY_MEMBER_CHUNK_SIZE) {
    const chunk = memberRefs.slice(i, i + DELETE_LOBBY_MEMBER_CHUNK_SIZE);
    const isLastChunk = i + DELETE_LOBBY_MEMBER_CHUNK_SIZE >= memberRefs.length;
    const batch = writeBatch(db);
    chunk.forEach((ref) => batch.delete(ref));
    if (isLastChunk) batch.delete(doc(db, "lobbies", lobbyId));
    await batch.commit();
  }

  // A lobby with no member docs at all still has to lose its own doc.
  if (memberRefs.length === 0) {
    const batch = writeBatch(db);
    batch.delete(doc(db, "lobbies", lobbyId));
    await batch.commit();
  }
}

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
 *
 * Message deletes cost exactly the same one get() each, so they share the
 * budget and the chunk size. The lobby doc's own delete is free: its rule
 * reads `resource.data.createdByUid`, which is the document already being
 * written, not a lookup — so appending it to a full chunk is safe.
 */
export const DELETE_LOBBY_CHUNK_SIZE = 15;

export async function deleteLobby(lobbyId: string): Promise<void> {
  // Both subcollections are read before anything is deleted. The member rule
  // and the message rule both get() the lobby doc, so every delete here has to
  // land while that doc is still present.
  const [messagesSnap, membersSnap] = await Promise.all([
    getDocs(collection(db, "lobbies", lobbyId, "messages")),
    getDocs(collection(db, "lobbies", lobbyId, "members")),
  ]);

  // Messages before members before the lobby doc. The order carries two
  // separate loads:
  //
  //   - Authorization. Once the lobby doc is gone, get() on it returns null
  //     and every remaining delete is denied. It has to be last.
  //   - Recoverability. If the cascade dies part-way through — tab closed,
  //     network dropped — the lobby doc survives, so the lobby is still
  //     listed, still owned, and Sil can simply be pressed again. Deleting it
  //     first would strand whatever was left, invisibly and forever: that is
  //     exactly how five lobbies came to be sitting in production on
  //     2026-08-27 with 8 chat messages still under them.
  //
  // Messages were not deleted at all before that date, despite the delete
  // dialog promising "özel lobiyi ve sohbet geçmişini herkes için kalıcı
  // olarak siler" — the rules had `allow delete: if false` on them, so no
  // client could have done it.
  const refs = [...messagesSnap.docs, ...membersSnap.docs].map((d) => d.ref);

  // Sequential, not Promise.all: the lobby doc goes in the final batch, and
  // once it's gone the delete rules' get() on it fails, so any batch still in
  // flight would be denied. Ordering is the whole point here.
  for (let i = 0; i < refs.length; i += DELETE_LOBBY_CHUNK_SIZE) {
    const chunk = refs.slice(i, i + DELETE_LOBBY_CHUNK_SIZE);
    const isLastChunk = i + DELETE_LOBBY_CHUNK_SIZE >= refs.length;
    const batch = writeBatch(db);
    chunk.forEach((ref) => batch.delete(ref));
    if (isLastChunk) batch.delete(doc(db, "lobbies", lobbyId));
    await batch.commit();
  }

  // A lobby with nothing under it at all still has to lose its own doc.
  if (refs.length === 0) {
    const batch = writeBatch(db);
    batch.delete(doc(db, "lobbies", lobbyId));
    await batch.commit();
  }
}

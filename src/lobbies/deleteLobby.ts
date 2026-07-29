// src/lobbies/deleteLobby.ts
import { collection, doc, getDocs, writeBatch } from "firebase/firestore";
import { db } from "../firebase";

export async function deleteLobby(lobbyId: string): Promise<void> {
  const membersSnap = await getDocs(collection(db, "lobbies", lobbyId, "members"));
  const batch = writeBatch(db);
  membersSnap.docs.forEach((memberDoc) => batch.delete(memberDoc.ref));
  batch.delete(doc(db, "lobbies", lobbyId));
  await batch.commit();
}

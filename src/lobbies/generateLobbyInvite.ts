import { addDoc, collection } from "firebase/firestore";
import { db } from "../firebase";
import { LobbyInvite, LOBBY_INVITE_LIFETIME_MS } from "./lobbyTypes";

export async function generateLobbyInvite(lobbyId: string, createdByUid: string): Promise<string> {
  const now = Date.now();
  const invite: LobbyInvite = {
    lobbyId,
    createdByUid,
    createdAt: now,
    expiresAt: now + LOBBY_INVITE_LIFETIME_MS,
  };
  const docRef = await addDoc(collection(db, "lobbyInvites"), invite);
  return docRef.id;
}

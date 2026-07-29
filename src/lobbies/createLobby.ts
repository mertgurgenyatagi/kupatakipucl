import { collection, doc, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { Lobby, LobbyMember, LobbyMessage, LOBBY_NAME_MAX_LENGTH } from "./lobbyTypes";
import { buildLobbySystemText } from "./sendLobbyMessage";

export async function createLobby(uid: string, name: string, creatorFirstName: string): Promise<string> {
  const trimmedName = name.trim().slice(0, LOBBY_NAME_MAX_LENGTH);
  const lobbyRef = doc(collection(db, "lobbies"));
  const memberRef = doc(db, "lobbies", lobbyRef.id, "members", uid);
  const systemMessageRef = doc(collection(db, "lobbies", lobbyRef.id, "messages"));

  const lobby: Lobby = { name: trimmedName, createdByUid: uid, createdAt: Date.now() };
  const member: LobbyMember = { uid, joinedAt: Date.now(), viaInviteId: null };
  const systemMessage: LobbyMessage = {
    uid,
    text: buildLobbySystemText("created", creatorFirstName),
    createdAt: Date.now(),
    system: { kind: "created", subjectUid: uid },
  };

  const batch = writeBatch(db);
  batch.set(lobbyRef, lobby);
  batch.set(memberRef, member);
  batch.set(systemMessageRef, systemMessage);
  await batch.commit();

  return lobbyRef.id;
}

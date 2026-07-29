import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { LOBBY_NAME_MAX_LENGTH } from "./lobbyTypes";
import { sendLobbySystemMessage } from "./sendLobbyMessage";

export async function renameLobby(
  lobbyId: string,
  uid: string,
  renamerFirstName: string,
  newName: string
): Promise<void> {
  const trimmed = newName.trim().slice(0, LOBBY_NAME_MAX_LENGTH);
  if (!trimmed) return;
  await updateDoc(doc(db, "lobbies", lobbyId), { name: trimmed });
  await sendLobbySystemMessage(lobbyId, uid, "renamed", uid, renamerFirstName);
}

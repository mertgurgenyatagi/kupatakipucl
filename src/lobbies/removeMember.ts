import { arrayRemove, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { sendLobbySystemMessage } from "./sendLobbyMessage";

export async function removeMember(
  lobbyId: string,
  creatorUid: string,
  removedUid: string,
  removedFirstName: string
): Promise<void> {
  await deleteDoc(doc(db, "lobbies", lobbyId, "members", removedUid));
  await updateDoc(doc(db, "lobbies", lobbyId), { memberUids: arrayRemove(removedUid) });
  await sendLobbySystemMessage(lobbyId, creatorUid, "removed", removedUid, removedFirstName);
}

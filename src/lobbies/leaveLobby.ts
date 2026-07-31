import { arrayRemove, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { LobbyMember, LobbyWithId } from "./lobbyTypes";
import { sendLobbySystemMessage } from "./sendLobbyMessage";

export async function leaveLobby(
  lobby: LobbyWithId,
  uid: string,
  leaverFirstName: string,
  remainingMembers: LobbyMember[]
): Promise<void> {
  const isCreator = lobby.createdByUid === uid;

  if (isCreator && remainingMembers.length === 0) {
    await deleteDoc(doc(db, "lobbies", lobby.id, "members", uid));
    await deleteDoc(doc(db, "lobbies", lobby.id));
    return;
  }

  if (isCreator) {
    const nextOwner = [...remainingMembers].sort((a, b) => a.joinedAt - b.joinedAt)[0];
    await updateDoc(doc(db, "lobbies", lobby.id), { createdByUid: nextOwner.uid });
  }

  // Message must be sent BEFORE the leaver's own member doc is deleted: the
  // message create rule requires exists(members/{request.auth.uid}) for the
  // sender, so sending after the delete would always be denied (2026-07-30,
  // task-13 fix). Mirrors joinLobbyViaInvite.ts's create-then-announce order.
  await sendLobbySystemMessage(lobby.id, uid, "left", uid, leaverFirstName);
  await deleteDoc(doc(db, "lobbies", lobby.id, "members", uid));
  await updateDoc(doc(db, "lobbies", lobby.id), { memberUids: arrayRemove(uid) });
}

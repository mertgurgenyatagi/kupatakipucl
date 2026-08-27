import { arrayRemove, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { LobbyMember, LobbyWithId } from "./lobbyTypes";
import { sendLobbySystemMessage } from "./sendLobbyMessage";
import { deleteLobby } from "./deleteLobby";

export async function leaveLobby(
  lobby: LobbyWithId,
  uid: string,
  leaverFirstName: string,
  remainingMembers: LobbyMember[]
): Promise<void> {
  const isCreator = lobby.createdByUid === uid;

  // The last member out deletes the lobby, and that has to be the same cascade
  // the Sil button runs — not a hand-rolled pair of deletes. This branch used
  // to remove the member doc and the lobby doc directly and leave every chat
  // message under it orphaned, which is the more likely of the two ways the
  // five stranded lobbies found in production on 2026-08-27 got there: a
  // one-person test lobby is left, not deleted.
  if (isCreator && remainingMembers.length === 0) {
    await deleteLobby(lobby.id);
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

// src/lobbies/joinLobbyViaInvite.ts
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { LobbyInvite, LobbyMember, LOBBY_MAX_JOINED } from "./lobbyTypes";
import { sendLobbySystemMessage } from "./sendLobbyMessage";

export type JoinLobbyResult =
  | { outcome: "joined"; lobbyId: string }
  | { outcome: "already-member"; lobbyId: string }
  | { outcome: "invalid-or-expired" }
  | { outcome: "at-cap" };

export async function joinLobbyViaInvite(
  inviteId: string,
  uid: string,
  joinerFirstName: string,
  currentLobbyCount: number
): Promise<JoinLobbyResult> {
  const inviteSnap = await getDoc(doc(db, "lobbyInvites", inviteId));
  if (!inviteSnap.exists()) return { outcome: "invalid-or-expired" };

  const invite = inviteSnap.data() as LobbyInvite;
  if (invite.expiresAt <= Date.now()) return { outcome: "invalid-or-expired" };

  const lobbySnap = await getDoc(doc(db, "lobbies", invite.lobbyId));
  if (!lobbySnap.exists()) return { outcome: "invalid-or-expired" };

  const memberSnap = await getDoc(doc(db, "lobbies", invite.lobbyId, "members", uid));
  if (memberSnap.exists()) return { outcome: "already-member", lobbyId: invite.lobbyId };

  if (currentLobbyCount >= LOBBY_MAX_JOINED) return { outcome: "at-cap" };

  const member: LobbyMember = { uid, joinedAt: Date.now(), viaInviteId: inviteId };
  await setDoc(doc(db, "lobbies", invite.lobbyId, "members", uid), member);
  await sendLobbySystemMessage(invite.lobbyId, uid, "joined", uid, joinerFirstName);

  return { outcome: "joined", lobbyId: invite.lobbyId };
}

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

  // No separate "lobby still exists" getDoc() here: that read was gated by
  // rules on already being a member of the lobby, which a genuine
  // first-time joiner never is, so it threw PERMISSION_DENIED before this
  // function could ever reach its graceful outcomes. The invite doc's own
  // fields (lobbyId, expiresAt) are the source of truth for usability
  // instead. A stale invite pointing at a since-deleted lobby is an
  // existing, accepted limitation (invites aren't cascade-deleted with
  // their lobby) — not something this fix newly introduces or needs to
  // solve; it will surface later as a setDoc failure instead of an early
  // getDoc failure (2026-07-30, task-13 fix).
  const memberSnap = await getDoc(doc(db, "lobbies", invite.lobbyId, "members", uid));
  if (memberSnap.exists()) return { outcome: "already-member", lobbyId: invite.lobbyId };

  if (currentLobbyCount >= LOBBY_MAX_JOINED) return { outcome: "at-cap" };

  const member: LobbyMember = { uid, joinedAt: Date.now(), viaInviteId: inviteId };
  await setDoc(doc(db, "lobbies", invite.lobbyId, "members", uid), member);
  await sendLobbySystemMessage(invite.lobbyId, uid, "joined", uid, joinerFirstName);

  return { outcome: "joined", lobbyId: invite.lobbyId };
}

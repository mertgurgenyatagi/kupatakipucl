import { Message } from "../chat/messageTypes";

export interface Lobby {
  name: string;
  createdByUid: string;
  createdAt: number;
}

export interface LobbyWithId extends Lobby {
  id: string;
}

export interface LobbyMember {
  uid: string;
  joinedAt: number;
  /** Which invite doc this membership was created from. `null` only for the
   *  creator's own bootstrap membership, written in the same operation as
   *  the lobby doc itself — there's no invite to reference at that moment. */
  viaInviteId: string | null;
}

export interface LobbyInvite {
  lobbyId: string;
  createdByUid: string;
  createdAt: number;
  expiresAt: number;
}

export interface LobbyInviteWithId extends LobbyInvite {
  id: string;
}

export type LobbySystemKind = "created" | "joined" | "left" | "removed" | "renamed";

export interface LobbySystemInfo {
  kind: LobbySystemKind;
  /** Who this system message narrates about. May differ from the message's
   *  own `uid` (the acting writer) — e.g. for "removed", `uid` is the
   *  creator performing the removal, `subjectUid` is the person removed. */
  subjectUid: string;
}

export interface LobbyMessage extends Message {
  system?: LobbySystemInfo;
}

export const LOBBY_NAME_MAX_LENGTH = 15;
export const LOBBY_MAX_OWNED = 3;
export const LOBBY_MAX_JOINED = 3;
export const LOBBY_INVITE_LIFETIME_MS = 60 * 60 * 1000;

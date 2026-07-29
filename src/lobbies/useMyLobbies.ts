import { useEffect, useState } from "react";
import { collection, collectionGroup, documentId, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { Lobby, LobbyMember } from "./lobbyTypes";

export interface MyLobby extends Lobby {
  id: string;
  myJoinedAt: number;
}

interface MembershipEntry {
  lobbyId: string;
  joinedAt: number;
}

interface MyLobbiesSubscription {
  unsubscribeMembers: () => void;
  unsubscribeLobbyDocs: () => void;
  listeners: Set<(lobbies: MyLobby[]) => void>;
  memberships: MembershipEntry[];
  lobbyDocs: Map<string, Lobby>;
  latest: MyLobby[] | undefined;
}

const subscriptions = new Map<string, MyLobbiesSubscription>();

function recompute(sub: MyLobbiesSubscription): MyLobby[] {
  return sub.memberships
    .map((m) => {
      const lobby = sub.lobbyDocs.get(m.lobbyId);
      return lobby ? { ...lobby, id: m.lobbyId, myJoinedAt: m.joinedAt } : null;
    })
    .filter((l): l is MyLobby => l !== null);
}

function emit(sub: MyLobbiesSubscription): void {
  sub.latest = recompute(sub);
  sub.listeners.forEach((listener) => listener(sub.latest!));
}

function resubscribeLobbyDocs(uid: string, thisSub: MyLobbiesSubscription): void {
  thisSub.unsubscribeLobbyDocs();
  const ids = thisSub.memberships.map((m) => m.lobbyId);
  if (ids.length === 0) {
    thisSub.lobbyDocs = new Map();
    thisSub.unsubscribeLobbyDocs = () => {};
    emit(thisSub);
    return;
  }
  thisSub.unsubscribeLobbyDocs = onSnapshot(
    query(collection(db, "lobbies"), where(documentId(), "in", ids)),
    (snapshot) => {
      if (subscriptions.get(uid) !== thisSub) return;
      thisSub.lobbyDocs = new Map(snapshot.docs.map((d) => [d.id, d.data() as Lobby]));
      emit(thisSub);
    },
    (err: Error) => {
      console.error("Failed to load my lobbies' details", err);
    }
  );
}

function subscribeToMyLobbies(uid: string, onChange: (lobbies: MyLobby[]) => void): () => void {
  let sub = subscriptions.get(uid);
  if (!sub) {
    const thisSub: MyLobbiesSubscription = {
      unsubscribeMembers: () => {},
      unsubscribeLobbyDocs: () => {},
      listeners: new Set(),
      memberships: [],
      lobbyDocs: new Map(),
      latest: undefined,
    };
    thisSub.unsubscribeMembers = onSnapshot(
      query(collectionGroup(db, "members"), where("uid", "==", uid)),
      (snapshot) => {
        if (subscriptions.get(uid) !== thisSub) return;
        thisSub.memberships = snapshot.docs.map((docSnap) => ({
          lobbyId: docSnap.ref.parent.parent!.id,
          joinedAt: (docSnap.data() as LobbyMember).joinedAt,
        }));
        resubscribeLobbyDocs(uid, thisSub);
      },
      (err: Error) => {
        console.error("Failed to load my lobby memberships", err);
        thisSub.latest = thisSub.latest ?? [];
        emit(thisSub);
      }
    );
    subscriptions.set(uid, thisSub);
    sub = thisSub;
  }
  sub.listeners.add(onChange);
  if (sub.latest !== undefined) onChange(sub.latest);

  return () => {
    const current = subscriptions.get(uid);
    if (!current) return;
    current.listeners.delete(onChange);
    if (current.listeners.size === 0) {
      current.unsubscribeMembers();
      current.unsubscribeLobbyDocs();
      subscriptions.delete(uid);
    }
  };
}

export function useMyLobbies(uid: string | null) {
  const [lobbies, setLobbies] = useState<MyLobby[]>([]);
  const [loading, setLoading] = useState(uid !== null);

  useEffect(() => {
    if (!uid) {
      setLobbies([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return subscribeToMyLobbies(uid, (next) => {
      setLobbies(next);
      setLoading(false);
    });
  }, [uid]);

  return { lobbies, loading };
}

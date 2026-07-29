import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { LobbyMember } from "./lobbyTypes";

interface LobbyMembersSubscription {
  unsubscribe: () => void;
  listeners: Set<(members: LobbyMember[]) => void>;
  latest: LobbyMember[] | undefined;
}

const subscriptions = new Map<string, LobbyMembersSubscription>();

function subscribeToLobbyMembers(lobbyId: string, onChange: (members: LobbyMember[]) => void): () => void {
  let sub = subscriptions.get(lobbyId);
  if (!sub) {
    const thisSub: LobbyMembersSubscription = {
      unsubscribe: () => {},
      listeners: new Set(),
      latest: undefined,
    };
    thisSub.unsubscribe = onSnapshot(
      collection(db, "lobbies", lobbyId, "members"),
      (snapshot) => {
        if (subscriptions.get(lobbyId) !== thisSub) return;
        const next = snapshot.docs.map((d) => d.data() as LobbyMember);
        thisSub.latest = next;
        thisSub.listeners.forEach((listener) => listener(next));
      },
      (err: Error) => {
        console.error("Failed to load lobby members", err);
        thisSub.latest = thisSub.latest ?? [];
        thisSub.listeners.forEach((listener) => listener(thisSub.latest!));
      }
    );
    subscriptions.set(lobbyId, thisSub);
    sub = thisSub;
  }
  sub.listeners.add(onChange);
  if (sub.latest !== undefined) onChange(sub.latest);

  return () => {
    const current = subscriptions.get(lobbyId);
    if (!current) return;
    current.listeners.delete(onChange);
    if (current.listeners.size === 0) {
      current.unsubscribe();
      subscriptions.delete(lobbyId);
    }
  };
}

export function useLobbyMembers(lobbyId: string | null) {
  const [members, setMembers] = useState<LobbyMember[]>([]);
  const [loading, setLoading] = useState(lobbyId !== null);

  useEffect(() => {
    if (!lobbyId) {
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return subscribeToLobbyMembers(lobbyId, (next) => {
      setMembers(next);
      setLoading(false);
    });
  }, [lobbyId]);

  return { members, loading };
}

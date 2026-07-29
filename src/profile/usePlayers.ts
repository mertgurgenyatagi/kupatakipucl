// src/profile/usePlayers.ts
import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { Profile } from "./profileTypes";
import { getCached, setCached } from "../lib/sessionCache";

export interface Player extends Profile {
  uid: string;
}

const CACHE_KEY = "players";

/**
 * not-started-audit item 09: was a one-shot `getDocs`, cached for the
 * session — so a new sign-up or a changed name/photo never showed up
 * anywhere this list feeds (chat, forum, the home participant list) for
 * anyone already on the site until a hard reload. Live listener now, same
 * "show cached immediately, let the first snapshot silently reconcile it"
 * pattern useMessages.ts already established.
 */
export function usePlayers() {
  const cached = getCached<Player[]>(CACHE_KEY);
  const [players, setPlayers] = useState<Player[]>(cached ?? []);
  const [loading, setLoading] = useState(cached === undefined);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "profiles"),
      (snapshot) => {
        const next = snapshot.docs.map((docSnap: { id: string; data: () => unknown }) => ({
          uid: docSnap.id,
          ...(docSnap.data() as Profile),
        }));
        setCached(CACHE_KEY, next);
        setPlayers(next);
        setLoading(false);
      },
      (err: Error) => {
        console.error("Failed to load players", err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { players, loading };
}

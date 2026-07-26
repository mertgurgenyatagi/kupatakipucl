// src/profile/usePlayers.ts
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Profile } from "./profileTypes";
import { getCached, setCached } from "../lib/sessionCache";

export interface Player extends Profile {
  uid: string;
}

const CACHE_KEY = "players";

export function usePlayers() {
  const cached = getCached<Player[]>(CACHE_KEY);
  const [players, setPlayers] = useState<Player[]>(cached ?? []);
  // Already have a cached list from an earlier mount this session — show
  // it immediately instead of flashing back to a loading state, while
  // still refetching below to keep it fresh.
  const [loading, setLoading] = useState(cached === undefined);

  useEffect(() => {
    let ignore = false;
    getDocs(collection(db, "profiles"))
      .then((snapshot) => {
        if (ignore) return;
        const next = snapshot.docs.map((docSnap: { id: string; data: () => unknown }) => ({
          uid: docSnap.id,
          ...(docSnap.data() as Profile),
        }));
        setCached(CACHE_KEY, next);
        setPlayers(next);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load players", err);
        if (ignore) return;
        setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  return { players, loading };
}

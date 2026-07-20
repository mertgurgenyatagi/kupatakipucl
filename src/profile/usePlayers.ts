// src/profile/usePlayers.ts
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Profile } from "./profileTypes";

export interface Player extends Profile {
  uid: string;
}

export function usePlayers() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    getDocs(collection(db, "profiles"))
      .then((snapshot) => {
        if (ignore) return;
        setPlayers(
          snapshot.docs.map((docSnap: { id: string; data: () => unknown }) => ({
            uid: docSnap.id,
            ...(docSnap.data() as Profile),
          }))
        );
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

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export function useCurrentMatchday(): number | null {
  const [matchday, setMatchday] = useState<number | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "tournamentState", "current"), (snapshot) => {
      const data = snapshot.exists() ? (snapshot.data() as { currentMatchday?: number }) : null;
      setMatchday(typeof data?.currentMatchday === "number" ? data.currentMatchday : null);
    });
    return unsubscribe;
  }, []);

  return matchday;
}

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { TeamResult } from "./teamResultTypes";

export function useResults() {
  const [results, setResults] = useState<Record<string, TeamResult>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    getDocs(collection(db, "results"))
      .then((snapshot) => {
        if (ignore) return;
        const next: Record<string, TeamResult> = {};
        snapshot.docs.forEach((docSnap: { id: string; data: () => unknown }) => {
          next[docSnap.id] = docSnap.data() as TeamResult;
        });
        setResults(next);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load results", err);
        if (ignore) return;
        setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  return { results, loading };
}

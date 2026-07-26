import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { TeamResult } from "./teamResultTypes";
import { getCached, setCached } from "../lib/sessionCache";

const CACHE_KEY = "results";

export function useResults() {
  const cached = getCached<Record<string, TeamResult>>(CACHE_KEY);
  const [results, setResults] = useState<Record<string, TeamResult>>(cached ?? {});
  const [loading, setLoading] = useState(cached === undefined);

  useEffect(() => {
    let ignore = false;
    getDocs(collection(db, "results"))
      .then((snapshot) => {
        if (ignore) return;
        const next: Record<string, TeamResult> = {};
        snapshot.docs.forEach((docSnap: { id: string; data: () => unknown }) => {
          next[docSnap.id] = docSnap.data() as TeamResult;
        });
        setCached(CACHE_KEY, next);
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

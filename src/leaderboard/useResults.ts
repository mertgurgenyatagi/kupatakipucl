import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { TeamResult } from "./teamResultTypes";
import { getCached, setCached } from "../lib/sessionCache";

const CACHE_KEY = "results";

/** Live listener, not a one-shot read — was one-shot until the live-match
 *  feature (2026-09-07) needed a team's position to reorder in an open tab
 *  the moment a sync writes an updated `results` doc, without a manual
 *  refresh (PROJECT.md §3.4's "must update in place" rule). */
export function useResults() {
  const cached = getCached<Record<string, TeamResult>>(CACHE_KEY);
  const [results, setResults] = useState<Record<string, TeamResult>>(cached ?? {});
  const [loading, setLoading] = useState(cached === undefined);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "results"),
      (snapshot) => {
        const next: Record<string, TeamResult> = {};
        snapshot.docs.forEach((docSnap: { id: string; data: () => unknown }) => {
          next[docSnap.id] = docSnap.data() as TeamResult;
        });
        setCached(CACHE_KEY, next);
        setResults(next);
        setLoading(false);
      },
      (err: Error) => {
        console.error("Failed to load results", err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { results, loading };
}

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { RealFixture } from "./realFixtureTypes";
import { getCached, setCached } from "../lib/sessionCache";

const CACHE_KEY = "fixtures";

/** Live listener on the real fixture calendar (fixtures/{id}, synced by
 *  functions/fixtures) — was a one-shot read until the live-match feature
 *  (2026-09-07) needed an open tab's score/status to update in place
 *  without a manual refresh, same rule as every other "must update in
 *  place" read in the app (PROJECT.md §3.4). Sorted by `order` so callers
 *  get true chronological order without re-sorting themselves. */
export function useFixtures() {
  const cached = getCached<RealFixture[]>(CACHE_KEY);
  const [fixtures, setFixtures] = useState<RealFixture[]>(cached ?? []);
  const [loading, setLoading] = useState(cached === undefined);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "fixtures"),
      (snapshot) => {
        const next = snapshot.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as RealFixture)
          .sort((a, b) => a.order - b.order);
        setCached(CACHE_KEY, next);
        setFixtures(next);
        setLoading(false);
      },
      (err: Error) => {
        console.error("Failed to load fixtures", err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { fixtures, loading };
}

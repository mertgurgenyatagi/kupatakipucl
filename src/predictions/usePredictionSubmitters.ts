import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

/** Just the set of uids with a `predictions/{uid}` doc — who has submitted,
 *  not what they submitted. Full-collection fetch, same pattern as
 *  usePlayers.ts: a one-shot fetch (not a live listener), so cost is
 *  O(page visits), not O(visits × listeners) — fine up to the site's real
 *  target of ~500 participants; only worth revisiting if that target grows
 *  by an order of magnitude (scaling-audit No. 13, 2026-07-31). */
export function usePredictionSubmitters() {
  const [submitterUids, setSubmitterUids] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    getDocs(collection(db, "predictions"))
      .then((snapshot) => {
        if (ignore) return;
        setSubmitterUids(new Set(snapshot.docs.map((docSnap: { id: string }) => docSnap.id)));
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load prediction submitters", err);
        if (ignore) return;
        setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  return { submitterUids, loading };
}

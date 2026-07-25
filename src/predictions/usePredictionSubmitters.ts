import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

/** Just the set of uids with a `predictions/{uid}` doc — who has submitted,
 *  not what they submitted. Full-collection fetch, same pattern as
 *  usePosts.ts/usePlayers.ts: fine at this friend-group's scale (~30-50
 *  people), no pagination needed. */
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

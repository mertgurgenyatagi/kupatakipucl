import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import { RankSnapshot } from "./rankSnapshotTypes";

export function useRankSnapshots(): { snapshots: RankSnapshot[]; loading: boolean } {
  const [snapshots, setSnapshots] = useState<RankSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const snapshotsQuery = query(collection(db, "rankSnapshots"), orderBy("matchday"));
    const unsubscribe = onSnapshot(
      snapshotsQuery,
      (snapshot) => {
        setSnapshots(snapshot.docs.map((d) => d.data() as RankSnapshot));
        setLoading(false);
      },
      (err: Error) => {
        console.error("Failed to load rank snapshots", err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { snapshots, loading };
}

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Prediction } from "../predictions/predictionTypes";
import { Profile } from "../profile/profileTypes";
import { useResults } from "./useResults";
import { computeScore } from "./scoring";
import { LeaderboardEntry } from "./leaderboardTypes";

export function useLeaderboard() {
  const { results, loading: resultsLoading } = useResults();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (resultsLoading) return;
    let ignore = false;
    Promise.all([getDocs(collection(db, "predictions")), getDocs(collection(db, "profiles"))])
      .then(([predictionsSnapshot, profilesSnapshot]) => {
        if (ignore) return;
        const profilesById = new Map<string, Profile>();
        profilesSnapshot.docs.forEach((docSnap: { id: string; data: () => unknown }) => {
          profilesById.set(docSnap.id, docSnap.data() as Profile);
        });
        const next: LeaderboardEntry[] = [];
        predictionsSnapshot.docs.forEach((docSnap: { id: string; data: () => unknown }) => {
          const profile = profilesById.get(docSnap.id);
          if (!profile) return;
          const prediction = docSnap.data() as Prediction;
          next.push({
            uid: docSnap.id,
            firstName: profile.firstName,
            lastName: profile.lastName,
            photoURL: profile.photoURL,
            points: computeScore(prediction.ranking, results),
            ranking: prediction.ranking,
          });
        });
        next.sort((a, b) => b.points - a.points);
        setEntries(next);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load leaderboard", err);
        if (ignore) return;
        setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [results, resultsLoading]);

  return { entries, loading: loading || resultsLoading };
}

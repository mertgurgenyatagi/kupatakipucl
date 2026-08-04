import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { KnockoutPrediction } from "./knockoutTypes";
import { MOCK_ROUND_OF_16 } from "./mockKnockoutData";

export const RO16_TEAM_IDS = new Set(
  MOCK_ROUND_OF_16.flatMap((m) => [m.homeTeamId, m.awayTeamId])
);

export function useAllKnockoutPredictions() {
  const [predictions, setPredictions] = useState<Record<string, KnockoutPrediction>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    getDocs(collection(db, "knockoutPredictions"))
      .then((snapshot) => {
        if (ignore) return;
        const map: Record<string, KnockoutPrediction> = {};
        snapshot.docs.forEach((doc) => {
          map[doc.id] = doc.data() as KnockoutPrediction;
        });
        setPredictions(map);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load all knockout predictions", err);
        if (ignore) return;
        setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  return { predictions, loading };
}

export function getKnockoutStageBadge(
  teamId: string,
  prediction: KnockoutPrediction | undefined,
  isRo16Team: boolean
): { label: string; isCrown: boolean } | null {
  if (!isRo16Team || !prediction) return null;
  if (prediction.champion === teamId) {
    return { label: "👑", isCrown: true };
  }
  if (prediction.finalists?.includes(teamId)) {
    return { label: "F", isCrown: false };
  }
  if (prediction.semiFinalists?.includes(teamId)) {
    return { label: "YF", isCrown: false };
  }
  if (prediction.quarterFinalists?.includes(teamId)) {
    return { label: "ÇF", isCrown: false };
  }
  return { label: "S16", isCrown: false };
}

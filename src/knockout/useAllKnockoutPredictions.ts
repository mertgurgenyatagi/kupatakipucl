import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { KnockoutPrediction } from "./knockoutTypes";
import { MOCK_ROUND_OF_16 } from "./mockKnockoutData";
import { getCached, setCached } from "../lib/sessionCache";

export const RO16_TEAM_IDS = new Set(
  MOCK_ROUND_OF_16.flatMap((m) => [m.homeTeamId, m.awayTeamId])
);

const CACHE_KEY = "allKnockoutPredictions";

/** Every participant's knockout bracket, keyed by uid. Read by TeamPopup and
 *  MatchupPopup, so before sessionCache (2026-08-07, scaling-250 design spec
 *  §4) every popup open — and every re-open — paid a fresh full-collection
 *  fetch that grows to 250 docs. */
export function useAllKnockoutPredictions() {
  const cached = getCached<Record<string, KnockoutPrediction>>(CACHE_KEY);
  const [predictions, setPredictions] = useState<Record<string, KnockoutPrediction>>(cached ?? {});
  const [loading, setLoading] = useState(cached === undefined);

  useEffect(() => {
    let ignore = false;
    getDocs(collection(db, "knockoutPredictions"))
      .then((snapshot) => {
        if (ignore) return;
        const map: Record<string, KnockoutPrediction> = {};
        snapshot.docs.forEach((doc) => {
          map[doc.id] = doc.data() as KnockoutPrediction;
        });
        setCached(CACHE_KEY, map);
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

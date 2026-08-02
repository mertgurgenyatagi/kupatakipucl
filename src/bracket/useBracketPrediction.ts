import { useEffect, useState } from "react";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { MatchupId } from "./bracketStructure";
import { BracketPrediction } from "./bracketPredictionTypes";

export function useBracketPrediction(uid: string | null): { prediction: BracketPrediction | null; loading: boolean } {
  const [prediction, setPrediction] = useState<BracketPrediction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setPrediction(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = onSnapshot(
      doc(db, "bracketPredictions", uid),
      (snapshot) => {
        setPrediction(snapshot.exists() ? (snapshot.data() as BracketPrediction) : null);
        setLoading(false);
      },
      (err: Error) => {
        console.error("Failed to load bracket prediction", err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [uid]);

  return { prediction, loading };
}

/**
 * One-time-only save (GREAT_LEAP_SPEC.md §5.2 — "no revisions"): unlike
 * usePrediction.ts's savePrediction, this throws if a submission already
 * exists rather than overwriting it. firestore.rules' `allow update: if
 * false` is the real enforcement; this is a fast client-side guard.
 */
export async function saveBracketPrediction(
  uid: string,
  picks: Record<MatchupId, string>
): Promise<BracketPrediction> {
  const existing = await getDoc(doc(db, "bracketPredictions", uid));
  if (existing.exists()) {
    throw new Error("Bracket prediction already submitted");
  }
  const prediction: BracketPrediction = { picks, submittedAt: Date.now() };
  await setDoc(doc(db, "bracketPredictions", uid), prediction);
  return prediction;
}

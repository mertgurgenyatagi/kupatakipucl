import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Prediction } from "./predictionTypes";

export function usePrediction(uid: string | null) {
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    if (!uid) {
      setPrediction(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    getDoc(doc(db, "predictions", uid))
      .then((snapshot) => {
        if (ignore) return;
        setPrediction(snapshot.exists() ? (snapshot.data() as Prediction) : null);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load prediction", err);
        if (ignore) return;
        setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [uid]);

  return { prediction, loading };
}

export async function savePrediction(uid: string, ranking: string[]): Promise<Prediction> {
  const now = Date.now();
  const existing = await getDoc(doc(db, "predictions", uid));
  const submittedAt = existing.exists() ? (existing.data() as Prediction).submittedAt : now;
  const prediction: Prediction = { ranking, submittedAt, updatedAt: now };
  await setDoc(doc(db, "predictions", uid), prediction);
  return prediction;
}

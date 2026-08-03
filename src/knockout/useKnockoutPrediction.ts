import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { KnockoutPrediction } from "./knockoutTypes";

export function useKnockoutPrediction(uid: string | null) {
  const [prediction, setPrediction] = useState<KnockoutPrediction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    if (!uid) {
      setPrediction(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    getDoc(doc(db, "knockoutPredictions", uid))
      .then((snapshot) => {
        if (ignore) return;
        setPrediction(snapshot.exists() ? (snapshot.data() as KnockoutPrediction) : null);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load knockout prediction", err);
        if (ignore) return;
        setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [uid]);

  return { prediction, loading };
}

export async function saveKnockoutPrediction(
  uid: string,
  data: Omit<KnockoutPrediction, "submittedAt" | "updatedAt">
): Promise<KnockoutPrediction> {
  const now = Date.now();
  const existing = await getDoc(doc(db, "knockoutPredictions", uid));
  const submittedAt = existing.exists() ? (existing.data() as KnockoutPrediction).submittedAt : now;

  const payload: KnockoutPrediction = {
    ...data,
    submittedAt,
    updatedAt: now,
  };

  await setDoc(doc(db, "knockoutPredictions", uid), payload);
  return payload;
}

export async function deleteKnockoutPrediction(uid: string): Promise<void> {
  await deleteDoc(doc(db, "knockoutPredictions", uid));
}

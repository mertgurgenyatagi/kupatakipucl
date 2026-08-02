import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { BracketPrediction } from "./bracketPredictionTypes";
import { getCached, setCached } from "../lib/sessionCache";

const CACHE_KEY = "allBracketPredictions";

export function useAllBracketPredictions() {
  const cached = getCached<BracketPrediction[]>(CACHE_KEY);
  const [predictions, setPredictions] = useState<BracketPrediction[]>(cached ?? []);
  const [loading, setLoading] = useState(cached === undefined);

  useEffect(() => {
    let ignore = false;
    getDocs(collection(db, "bracketPredictions"))
      .then((snapshot) => {
        if (ignore) return;
        const next = snapshot.docs.map((docSnap: { data: () => unknown }) => docSnap.data() as BracketPrediction);
        setCached(CACHE_KEY, next);
        setPredictions(next);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load bracket predictions", err);
        if (ignore) return;
        setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  return { predictions, loading };
}

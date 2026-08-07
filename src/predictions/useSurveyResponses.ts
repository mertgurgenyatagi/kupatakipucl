import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { SurveyResponse } from "./surveyTypes";
import { getCached, setCached } from "../lib/sessionCache";

export interface SurveyResponseEntry extends SurveyResponse {
  uid: string;
}

const CACHE_KEY = "surveyResponses";

/** Every participant's quiz answers — a full-collection fetch that grows to
 *  250 docs, paid on every Stats visit. Wired into sessionCache 2026-08-07
 *  (scaling-250 design spec §4), same pattern as the other one-shot hooks:
 *  show cached immediately, let the fetch silently reconcile it. */
export function useSurveyResponses() {
  const cached = getCached<SurveyResponseEntry[]>(CACHE_KEY);
  const [responses, setResponses] = useState<SurveyResponseEntry[]>(cached ?? []);
  const [loading, setLoading] = useState(cached === undefined);

  useEffect(() => {
    let ignore = false;
    getDocs(collection(db, "surveyResponses"))
      .then((snapshot) => {
        if (ignore) return;
        const next = snapshot.docs.map((docSnap: { id: string; data: () => unknown }) => ({
          uid: docSnap.id,
          ...(docSnap.data() as SurveyResponse),
        }));
        setCached(CACHE_KEY, next);
        setResponses(next);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load survey responses", err);
        if (ignore) return;
        setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  return { responses, loading };
}

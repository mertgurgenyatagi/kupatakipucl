import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { SurveyResponse } from "./surveyTypes";

export async function saveSurveyResponse(uid: string, response: SurveyResponse): Promise<void> {
  await setDoc(doc(db, "surveyResponses", uid), response);
}

/**
 * Reads *another* participant's survey answers (the participant popup's
 * quiz-answers widget) — deliberately reversed from this project's earlier
 * "survey answers are aggregate-only, never per-profile" stance (SPEC.md §4,
 * §8d), per Mert's explicit call. `surveyResponses/{uid}` read access was
 * loosened from owner-only to any signed-in participant to match
 * (firestore.rules). A logged-out viewer (predictions/leaderboard allow
 * ST_NLI) will get a permission error here — caught below, surfaced as
 * `error` rather than thrown, same graceful-degradation shape as this
 * codebase's other Firestore hooks.
 */
export function useSurveyResponse(uid: string | null) {
  const [response, setResponse] = useState<SurveyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!uid) {
      setResponse(null);
      setError(false);
      return;
    }
    let ignore = false;
    setLoading(true);
    setError(false);
    getDoc(doc(db, "surveyResponses", uid))
      .then((snap) => {
        if (ignore) return;
        setResponse(snap.exists() ? (snap.data() as SurveyResponse) : null);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load survey response", err);
        if (ignore) return;
        setError(true);
        setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [uid]);

  return { response, loading, error };
}

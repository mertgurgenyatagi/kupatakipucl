import { useEffect, useState } from "react";
import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { SurveyResponse } from "./surveyTypes";

export async function saveSurveyResponse(uid: string, response: SurveyResponse): Promise<void> {
  await setDoc(doc(db, "surveyResponses", uid), response);
}

/**
 * Part of deleting an account, and the reason the rules had to stop
 * forbidding deletes (firestore.rules, 2026-08-27). While this document
 * outlived the profile it belonged to, ProfileGate saw "no profile but a
 * survey", sent the user back through SignupFlow, and SignupFlow's closing
 * setDoc was rejected as an update — so anyone who deleted their account
 * could never sign up again.
 */
export async function deleteSurveyResponse(uid: string): Promise<void> {
  await deleteDoc(doc(db, "surveyResponses", uid));
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

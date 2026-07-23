import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { SurveyResponse } from "./surveyTypes";

export interface SurveyResponseEntry extends SurveyResponse {
  uid: string;
}

export function useSurveyResponses() {
  const [responses, setResponses] = useState<SurveyResponseEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    getDocs(collection(db, "surveyResponses"))
      .then((snapshot) => {
        if (ignore) return;
        setResponses(
          snapshot.docs.map((docSnap: { id: string; data: () => unknown }) => ({
            uid: docSnap.id,
            ...(docSnap.data() as SurveyResponse),
          }))
        );
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

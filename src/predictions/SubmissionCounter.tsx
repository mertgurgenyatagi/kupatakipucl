import { useEffect, useState } from "react";
import { collection, getCountFromServer } from "firebase/firestore";
import { db } from "../firebase";

export function SubmissionCounter() {
  const [submitted, setSubmitted] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getCountFromServer(collection(db, "predictions")),
      getCountFromServer(collection(db, "profiles")),
    ]).then(([predictionsSnapshot, profilesSnapshot]) => {
      if (cancelled) return;
      setSubmitted(predictionsSnapshot.data().count);
      setTotal(profilesSnapshot.data().count);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (submitted === null || total === null) return null;

  return (
    <p>
      {submitted} / {total} kişi tahminini gönderdi
    </p>
  );
}

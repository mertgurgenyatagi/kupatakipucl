import { useEffect, useState } from "react";
import { collection, doc, getDocs, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { FIXTURES } from "./fixtures";
import { computeStandings, MatchOutcome } from "./standings";

export function useDevMatches() {
  const [outcomes, setOutcomes] = useState<Record<string, MatchOutcome>>({});
  const [loading, setLoading] = useState(true);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    getDocs(collection(db, "devMatches"))
      .then((snapshot) => {
        if (ignore) return;
        const next: Record<string, MatchOutcome> = {};
        snapshot.docs.forEach((docSnap: { id: string; data: () => unknown }) => {
          next[docSnap.id] = (docSnap.data() as { outcome: MatchOutcome }).outcome;
        });
        setOutcomes(next);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load dev match outcomes", err);
        if (ignore) return;
        setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [refreshIndex]);

  return { outcomes, loading, refetch: () => setRefreshIndex((n) => n + 1) };
}

// Enforces "can't decide a later match before every earlier one is decided" —
// only applies to setting a real outcome; reverting a match back to
// notplayed is always allowed regardless of what comes after it.
export async function setMatchOutcome(
  currentOutcomes: Record<string, MatchOutcome>,
  fixtureId: string,
  outcome: MatchOutcome
): Promise<void> {
  const fixture = FIXTURES.find((f) => f.id === fixtureId);
  if (!fixture) {
    throw new Error(`Unknown fixture: ${fixtureId}`);
  }

  if (outcome !== "notplayed") {
    const earlierFixtures = FIXTURES.filter((f) => f.order < fixture.order);
    const allEarlierDecided = earlierFixtures.every(
      (f) => (currentOutcomes[f.id] ?? "notplayed") !== "notplayed"
    );
    if (!allEarlierDecided) {
      throw new Error("All earlier matches must be decided first.");
    }
  }

  const nextOutcomes = { ...currentOutcomes, [fixtureId]: outcome };
  const standings = computeStandings(nextOutcomes);

  const batch = writeBatch(db);
  batch.set(doc(db, "devMatches", fixtureId), { outcome });
  Object.entries(standings).forEach(([teamId, result]) => {
    batch.set(doc(db, "results", teamId), result);
  });
  await batch.commit();
}

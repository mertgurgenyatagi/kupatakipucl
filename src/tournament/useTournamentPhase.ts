import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { TournamentPhase } from "./tournamentPhase";
import { useDevConfig } from "../devpanel/useDevConfig";

/**
 * Phase is a manual, admin-set value (tournamentState/current), not derived
 * from a calendar date — the real league-phase/pre-knockout/knockout
 * transitions aren't something the app can compute on its own (see
 * onboarding/pagemap-questionnaires/pagemap-round-01.md). No doc yet ==
 * notstarted, same default as before anything's been set.
 */
export function useTournamentPhase(): TournamentPhase {
  const [phase, setPhase] = useState<TournamentPhase>("notstarted");
  const { config: devConfig } = useDevConfig();

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "tournamentState", "current"),
      (snapshot) => {
        const data = snapshot.exists() ? (snapshot.data() as { phase?: TournamentPhase }) : null;
        setPhase(data?.phase ?? "notstarted");
      },
      (err: Error) => {
        console.error("Failed to load tournament phase", err);
      }
    );
    return unsubscribe;
  }, []);

  // Dev panel override: bypasses the real Firestore value entirely once
  // explicitly set, so testing each phase doesn't depend on production data.
  if (import.meta.env.DEV && devConfig.phaseOverride !== null) {
    return devConfig.phaseOverride;
  }

  return phase;
}

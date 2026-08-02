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
 *
 * `loading` is true only until the first tournamentState snapshot (or, in
 * dev, the first devConfig snapshot) has arrived — callers that make a
 * one-way decision off `phase` (e.g. BracketPage.tsx's redirect) must wait
 * for it, since the pre-snapshot default of "notstarted" is a placeholder,
 * not a real reading.
 */
export function useTournamentPhase(): { phase: TournamentPhase; loading: boolean } {
  const [phase, setPhase] = useState<TournamentPhase>("notstarted");
  const [loading, setLoading] = useState(true);
  const { config: devConfig, loading: devConfigLoading } = useDevConfig();

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "tournamentState", "current"),
      (snapshot) => {
        const data = snapshot.exists() ? (snapshot.data() as { phase?: TournamentPhase }) : null;
        setPhase(data?.phase ?? "notstarted");
        setLoading(false);
      },
      (err: Error) => {
        console.error("Failed to load tournament phase", err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  // Dev panel override: bypasses the real Firestore value entirely once
  // explicitly set, so testing each phase doesn't depend on production data.
  if (import.meta.env.DEV && devConfig.phaseOverride !== null) {
    return { phase: devConfig.phaseOverride, loading: false };
  }

  return { phase, loading: loading || (import.meta.env.DEV && devConfigLoading) };
}

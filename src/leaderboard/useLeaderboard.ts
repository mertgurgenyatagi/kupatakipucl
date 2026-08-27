import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { LeaderboardEntry } from "./leaderboardTypes";
import { getCached, setCached } from "../lib/sessionCache";
import { useTournamentPhase } from "../tournament/useTournamentPhase";

const CACHE_KEY = "leaderboard";

/**
 * Used to fetch the full predictions + profiles collections and recompute
 * every score client-side, on every single visit. That's now done once,
 * server-side, by functions/leaderboard on every predictions/results
 * write — this just reads the one precomputed doc it produces, live
 * (scaling-audit No. 08/09, 2026-07-31). No doc yet (nobody's submitted or
 * no result/prediction write has landed since the function was deployed)
 * reads the same as an empty leaderboard.
 *
 * Not read at all before the league phase starts. Every entry in that
 * document carries a participant's full 36-team ranking, so from 2026-08-27
 * it is only readable once the phase leaves 'notstarted' — otherwise it
 * would hand out exactly what the predictions rules keep private until the
 * deadline (firestore.rules). Subscribing anyway would mean a guaranteed
 * permission error on every visit, so the pre-phase state is simply an
 * empty leaderboard, which is what the pages that mount this during
 * 'notstarted' already render.
 */
export function useLeaderboard() {
  const phase = useTournamentPhase();
  const started = phase !== "notstarted";
  const cached = getCached<LeaderboardEntry[]>(CACHE_KEY);
  const [entries, setEntries] = useState<LeaderboardEntry[]>(cached ?? []);
  const [loading, setLoading] = useState(cached === undefined);

  useEffect(() => {
    if (!started) {
      setEntries([]);
      setLoading(false);
      return;
    }
    const unsubscribe = onSnapshot(
      doc(db, "leaderboardCache", "current"),
      (snapshot) => {
        const data = snapshot.exists() ? (snapshot.data() as { entries: LeaderboardEntry[] }) : null;
        const next = data?.entries ?? [];
        setCached(CACHE_KEY, next);
        setEntries(next);
        setLoading(false);
      },
      (err: Error) => {
        console.error("Failed to load leaderboard", err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [started]);

  return { entries, loading };
}

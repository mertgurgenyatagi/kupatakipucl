import { useEffect, useState } from "react";
import { getTournamentPhase, TournamentPhase } from "./tournamentPhase";

function resolveNow(): Date {
  if (import.meta.env.DEV) {
    const params = new URLSearchParams(window.location.search);
    const debugDate = params.get("debugDate");
    if (debugDate) {
      const parsed = new Date(debugDate);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
  }
  return new Date();
}

export function useTournamentPhase(): TournamentPhase {
  const [phase, setPhase] = useState<TournamentPhase>(() => getTournamentPhase(resolveNow()));

  useEffect(() => {
    const recompute = () => setPhase(getTournamentPhase(resolveNow()));
    window.addEventListener("focus", recompute);
    return () => window.removeEventListener("focus", recompute);
  }, []);

  return phase;
}

import { useEffect, useState } from "react";
import { getTournamentPhase, TournamentPhase } from "./tournamentPhase";
import { useDevConfig } from "../devpanel/useDevConfig";

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
  const { config: devConfig } = useDevConfig();

  useEffect(() => {
    const recompute = () => setPhase(getTournamentPhase(resolveNow()));
    window.addEventListener("focus", recompute);
    return () => window.removeEventListener("focus", recompute);
  }, []);

  // Dev panel override: bypasses real-date/debugDate comparison entirely
  // once explicitly set, so testing doesn't depend on real-world timing.
  if (import.meta.env.DEV && devConfig.tournamentActive !== null) {
    return devConfig.tournamentActive ? "post" : "pre";
  }

  return phase;
}

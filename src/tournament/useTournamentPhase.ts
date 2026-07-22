import { useEffect, useState } from "react";
import { getTournamentPhase, TournamentPhase } from "./tournamentPhase";
import { useDevConfig } from "../devpanel/useDevConfig";
import { resolveNow } from "./now";

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

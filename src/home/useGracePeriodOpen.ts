import { isGracePeriodOpen } from "./deadlines";
import { useDevConfig } from "../devpanel/useDevConfig";

/** Same override-layering convention as useTournamentPhase.ts — a dev-only
 *  Firestore flag beats the real wall clock once explicitly set, so both
 *  banner states are previewable without waiting three real days. */
export function useGracePeriodOpen(): boolean {
  const { config } = useDevConfig();

  if (import.meta.env.DEV && config.gracePeriodOverride !== null) {
    return config.gracePeriodOverride === "open";
  }

  return isGracePeriodOpen();
}

import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useProfile } from "./useProfile";
import { useSurveyResponse } from "../predictions/useSurveyResponse";
import { useTournamentPhase } from "../tournament/useTournamentPhase";
import { SignupFlow } from "../signup/SignupFlow";
import { RegistrationClosedScreen } from "./RegistrationClosedScreen";

/**
 * Blocks the rest of the app until a signed-in user has both a profile
 * *and* a survey response — the quiz moved to be mandatory right after
 * sign-up (PAGEMAP_SPEC.md), so a profile alone is no longer enough to let
 * someone through.
 *
 * Deliberately does *not* treat "has a profile but no survey yet" as a
 * resumable state — abandoning mid-quiz (closing the tab, reloading)
 * cancels the whole signup rather than picking back up later (Mert's
 * explicit call). SignupFlow always starts at its welcome message; a stale
 * profile/photo from an abandoned attempt just gets overwritten once they
 * actually complete it, so there's nothing to explicitly clean up here.
 *
 * GREAT_LEAP_SPEC.md §4: once the tournament is no longer `notstarted`, a
 * genuinely never-onboarded account (no profile AND no survey — see this
 * feature's plan doc, Task 13, for why AND rather than the OR used just
 * below) can no longer start onboarding at all; it sees
 * RegistrationClosedScreen instead. An account with *any* onboarding
 * progress (a profile, even without a survey) is unaffected — "signing in
 * never closes."
 */
export function ProfileGate({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile(user?.uid ?? null);
  const { response: survey, loading: surveyLoading } = useSurveyResponse(user?.uid ?? null);
  const phase = useTournamentPhase();
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    setCompleted(false);
  }, [user?.uid]);

  if (authLoading || (user && (profileLoading || surveyLoading))) {
    return null;
  }

  if (user && !profile && !survey && phase !== "notstarted") {
    return <RegistrationClosedScreen />;
  }

  if (user && (!profile || !survey) && !completed) {
    return <SignupFlow uid={user.uid} onDone={() => setCompleted(true)} />;
  }

  return <>{children}</>;
}

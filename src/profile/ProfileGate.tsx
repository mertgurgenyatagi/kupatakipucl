import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useProfile } from "./useProfile";
import { useSurveyResponse } from "../predictions/useSurveyResponse";
import { SignupFlow } from "../signup/SignupFlow";

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
 */
export function ProfileGate({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile(user?.uid ?? null);
  const { response: survey, loading: surveyLoading } = useSurveyResponse(user?.uid ?? null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    setCompleted(false);
  }, [user?.uid]);

  if (authLoading || (user && (profileLoading || surveyLoading))) {
    return null;
  }

  if (user && (!profile || !survey) && !completed) {
    return <SignupFlow uid={user.uid} onDone={() => setCompleted(true)} />;
  }

  return <>{children}</>;
}

import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { getVisibilityState } from "../state/visibilityState";
import { isPageAllowed } from "../state/pageAccess";
import { useTournamentPhase } from "../tournament/useTournamentPhase";
import { useBracketState } from "../bracket/useBracketState";
import { useBracketPrediction, saveBracketPrediction } from "../bracket/useBracketPrediction";
import { BRACKET_INTRO_BEATS } from "../bracket/bracketIntroCopy";
import { IntroBeat } from "../predictions/IntroBeat";
import { BracketBoard } from "../bracket/BracketBoard";
import { MatchupId } from "../bracket/bracketStructure";

type FlowStep = "intro" | "rank" | "done";

// IntroBeat.tsx renders a single text/boldTerms/onContinue at a time (no
// multi-beat pagination built in), so the three BRACKET_INTRO_BEATS are
// joined into one paragraph here rather than stepped through one at a time.
// No bold terms carried over: each beat's boldTerm is a substring of that
// beat's own sentence, and IntroBeat's bolding splits matched text into
// separate DOM nodes, which would fragment the joined paragraph oddly at
// sentence-fragment boundaries once concatenated.
const INTRO_TEXT = BRACKET_INTRO_BEATS.map((beat) => beat.text).join(" ");

export function BracketPage() {
  const { user } = useAuth();
  const phase = useTournamentPhase();
  const { bracketState } = useBracketState();
  const { prediction, loading: predictionLoading } = useBracketPrediction(user?.uid ?? null);
  const [step, setStep] = useState<FlowStep>("intro");
  const [submitting, setSubmitting] = useState(false);

  const visibilityState = getVisibilityState(!!user, phase);
  if (!isPageAllowed("bracket", visibilityState)) {
    return <Navigate to="/" replace />;
  }

  // Bracket submission is open only during preknockout and closes the
  // moment knockout begins (GREAT_LEAP_SPEC.md §5.2: "the window is open
  // during preknockout and closed once knockout begins") — tighter than the
  // coarse PAGE_ACCESS gate above, which only knows about logged-in vs
  // logged-out.
  if (phase !== "preknockout") {
    return <Navigate to="/" replace />;
  }

  if (!predictionLoading && prediction) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(picks: Record<MatchupId, string>) {
    if (!user) return;
    setSubmitting(true);
    try {
      await saveBracketPrediction(user.uid, picks);
      setStep("done");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "intro") {
    return <IntroBeat text={INTRO_TEXT} onContinue={() => setStep("rank")} />;
  }

  if (step === "rank") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <BracketBoard ro16Teams={bracketState.ro16Teams} onSubmit={handleSubmit} />
        {submitting && <p className="mt-4 text-sm text-color_muted">Gönderiliyor…</p>}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h2 className="text-xl font-semibold">Tahminin kaydedildi.</h2>
    </div>
  );
}

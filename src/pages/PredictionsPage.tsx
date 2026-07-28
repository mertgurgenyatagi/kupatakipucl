import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { useAuth } from "../auth/AuthProvider";
import { useVisibilityState } from "../state/useVisibilityState";
import { isPageAllowed } from "../state/pageAccess";
import { usePrediction, savePrediction } from "../predictions/usePrediction";
import { useSurveyResponse } from "../predictions/useSurveyResponse";
import { TeamRanker } from "../predictions/TeamRanker";
import { TEAMS } from "../predictions/teams";
import { IntroBeat } from "../predictions/IntroBeat";
import { PREDICTION_INTRO_BEATS } from "../predictions/predictionIntroCopy";
import { ScoringExampleDiagram } from "../predictions/ScoringExampleDiagram";
import { buildScoringExampleWindow, pickFallbackTeam } from "../predictions/scoringExampleWindow";
import { AutoAdvance } from "../signup/AutoAdvance";
import { BounceCheck } from "../signup/BounceCheck";
import { sharpVariants } from "../signup/transitions";

// The scoring-example beat (index 1) is the only one with a visual.
const SCORING_EXAMPLE_BEAT_INDEX = 1;

type FlowStep = "intro" | "rank" | "done";

/**
 * /predictions is a one-time door now, not a page you keep coming back to
 * (predictions-page-round-02 §E): first submission only. Revising an
 * existing prediction lives entirely on ProfilePage.tsx's own widget, so
 * reaching this page with a prediction already saved (or once the league
 * phase has locked things regardless) just sends you home — there's nothing
 * left for this page to show.
 *
 * Shaped like SignupFlow.tsx on purpose: a full-viewport animated sequence
 * (fade beats, then the ranker, then a BounceCheck confirmation) rather than
 * a Frame/bento page, reusing that flow's own AutoAdvance/BounceCheck/
 * transition pieces instead of inventing new ones.
 */
export function PredictionsPage() {
  const { user } = useAuth();
  const state = useVisibilityState();
  const navigate = useNavigate();
  const { prediction, loading } = usePrediction(user?.uid ?? null);
  const { response: survey } = useSurveyResponse(user?.uid ?? null);
  const [step, setStep] = useState<FlowStep>("intro");
  const [beatIndex, setBeatIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  if (!isPageAllowed("predictions", state)) {
    return <p>Bu bölüm şu anda kullanılamıyor.</p>;
  }

  if (loading) return null;

  if (state !== "loggedin_notstarted" || prediction) {
    return <Navigate to="/" replace />;
  }

  const uid = user!.uid;
  const exampleTeamId = survey?.uclTeam ?? pickFallbackTeam(TEAMS, uid).id;
  const scoringExample = buildScoringExampleWindow(TEAMS, exampleTeamId);

  async function handleSubmit(order: string[]) {
    try {
      await savePrediction(uid, order);
      setError(null);
      setStep("done");
    } catch (err) {
      console.error("Failed to submit prediction", err);
      setError("Tahmininiz kaydedilemedi, tekrar deneyin.");
    }
  }

  function advanceBeat() {
    if (beatIndex + 1 >= PREDICTION_INTRO_BEATS.length) {
      setStep("rank");
    } else {
      setBeatIndex((i) => i + 1);
    }
  }

  return (
    <div className="relative flex h-dvh w-full cursor-default items-center justify-center overflow-hidden bg-background px-6 py-10">
      <AnimatePresence mode="wait">
        {step === "intro" && (
          <motion.div
            key={`intro-${beatIndex}`}
            variants={sharpVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <IntroBeat
              text={PREDICTION_INTRO_BEATS[beatIndex].text}
              boldTerms={PREDICTION_INTRO_BEATS[beatIndex].boldTerms}
              visual={
                beatIndex === SCORING_EXAMPLE_BEAT_INDEX ? (
                  <ScoringExampleDiagram teams={scoringExample.teams} centerIndex={scoringExample.centerIndex} />
                ) : undefined
              }
              onContinue={advanceBeat}
            />
          </motion.div>
        )}

        {step === "rank" && (
          <motion.div
            key="rank"
            variants={sharpVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="no-scrollbar flex h-full max-h-[calc(100dvh-5rem)] w-full max-w-xl flex-col"
          >
            <TeamRanker teams={TEAMS} initialOrder={TEAMS.map((t) => t.id)} onSubmit={handleSubmit} />
            {error && (
              <p role="alert" className="mt-2 text-sm text-color_remove">
                {error}
              </p>
            )}
          </motion.div>
        )}

        {step === "done" && (
          <motion.div key="done" variants={sharpVariants} initial="initial" animate="animate" exit="exit">
            <AutoAdvance delayMs={2000} onDone={() => navigate("/")}>
              <BounceCheck text="Tahminlerin kaydedildi!" />
            </AutoAdvance>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

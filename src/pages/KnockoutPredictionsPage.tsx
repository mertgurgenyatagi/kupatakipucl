import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { useAuth } from "../auth/AuthProvider";
import { useVisibilityState } from "../state/useVisibilityState";
import { isPageAllowed } from "../state/pageAccess";
import { useKnockoutPrediction, saveKnockoutPrediction } from "../knockout/useKnockoutPrediction";
import { KnockoutStagePicker } from "../knockout/KnockoutStagePicker";
import { MobileKnockoutBracket } from "../knockout/MobileKnockoutBracket";
import { useIsMobile } from "@/lib/useIsMobile";
import { KnockoutPrediction } from "../knockout/knockoutTypes";
import { IntroBeat } from "../predictions/IntroBeat";
import { AutoAdvance } from "../signup/AutoAdvance";
import { BounceCheck } from "../signup/BounceCheck";
import { sharpVariants } from "../signup/transitions";
import { PAGE_UNAVAILABLE_MESSAGE } from "@/components/ui/page-unavailable";
import { Skeleton } from "@/components/ui/skeleton";

const INTRO_BEATS = [
  {
    text: "Sıra eleme tahminlerinde.",
    boldTerms: [],
  },
  {
    text: "Bütün eleme turunu baştan sona seç.",
    boldTerms: [],
  },
  {
    text: "Son 16 turundaki doğru seçimlerin için 3 puan, çeyrek final için 4 puan, yarı final için 5 puan ve şampiyon seçimin için 6 puan kazanacaksın.",
    boldTerms: ["3", "4", "5", "6"],
  },
];

type FlowStep = "intro" | "pick" | "done";

function KnockoutSkeleton() {
  return (
    <div
      className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-4 p-8"
      aria-hidden
      data-testid="knockout-skeleton"
    >
      <Skeleton className="h-8 w-64 rounded-md" />
      <Skeleton className="h-4 w-80 rounded-sm" />
    </div>
  );
}

export function KnockoutPredictionsPage() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const state = useVisibilityState();
  const navigate = useNavigate();
  const { prediction, loading } = useKnockoutPrediction(user?.uid ?? null);
  const [step, setStep] = useState<FlowStep>("intro");
  const [beatIndex, setBeatIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isPageAllowed("knockoutPredictions", state)) {
    return <p>{PAGE_UNAVAILABLE_MESSAGE}</p>;
  }

  if (loading) return <KnockoutSkeleton />;

  // Require user authentication
  if (!user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(data: Omit<KnockoutPrediction, "submittedAt" | "updatedAt">) {
    try {
      setSubmitting(true);
      await saveKnockoutPrediction(user!.uid, data);
      setError(null);
      setStep("done");
    } catch (err) {
      console.error("Failed to submit knockout prediction", err);
      setError("Tahmininiz kaydedilemedi, tekrar deneyin.");
    } finally {
      setSubmitting(false);
    }
  }

  function advanceBeat() {
    if (beatIndex + 1 >= INTRO_BEATS.length) {
      setStep("pick");
    } else {
      setBeatIndex((i) => i + 1);
    }
  }

  return (
    <div
      className={`relative flex w-full cursor-default items-center justify-center overflow-hidden px-4 py-6 sm:px-6 sm:py-8 ${isMobile ? "h-full" : "h-dvh"}`}
      style={{ background: "radial-gradient(ellipse at 30% 0%, #1a1a24 0%, #0d0d12 45%, #050508 100%)" }}
    >
      {/* Monochromatic ambient depth blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/4 size-96 rounded-full bg-neutral-400/5 blur-3xl" />
        <div className="absolute -top-20 right-1/4 size-72 rounded-full bg-zinc-300/5 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 size-80 rounded-full bg-slate-400/5 blur-3xl" />
      </div>
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
              text={INTRO_BEATS[beatIndex].text}
              boldTerms={INTRO_BEATS[beatIndex].boldTerms}
              onContinue={advanceBeat}
            />
          </motion.div>
        )}

        {step === "pick" && (
          <motion.div
            key="pick"
            variants={sharpVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="no-scrollbar flex h-full max-h-[calc(100dvh-4rem)] w-full max-w-7xl mx-auto flex-col"
          >
            {/* The symmetric 7-column picker has no phone-width form; the
                wireframe asks for a one-sided scrolling bracket instead. */}
            {isMobile ? (
              <MobileKnockoutBracket
                initialPrediction={prediction}
                onSubmit={handleSubmit}
                submitting={submitting}
              />
            ) : (
              <KnockoutStagePicker
                initialPrediction={prediction}
                onSubmit={handleSubmit}
                submitting={submitting}
              />
            )}
            {error && (
              <p role="alert" className="mt-2 text-sm text-color_remove text-center">
                {error}
              </p>
            )}
          </motion.div>
        )}

        {step === "done" && (
          <motion.div key="done" variants={sharpVariants} initial="initial" animate="animate" exit="exit">
            <AutoAdvance delayMs={2000} onDone={() => navigate("/")}>
              <BounceCheck text="Eleme tahminlerin kaydedildi!" />
            </AutoAdvance>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

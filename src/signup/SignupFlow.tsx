import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { saveProfile } from "../profile/useProfile";
import { saveSurveyResponse } from "../predictions/useSurveyResponse";
import type { SurveyResponse, MessiOrRonaldo, Device } from "../predictions/surveyTypes";
import { MESSI_RONALDO_LABEL, DEVICE_LABEL } from "../predictions/surveyLabels";
import { FOOTBALL_KNOWLEDGE_OPTIONS, SUPER_LIG_TEAMS } from "./quizCopy";
import { AutoAdvance } from "./AutoAdvance";
import { WelcomeStep } from "./steps/WelcomeStep";
import { PhotoStep } from "./steps/PhotoStep";
import { NameStep } from "./steps/NameStep";
import { AgeRollerStep } from "./steps/AgeRollerStep";
import { UclTeamStep } from "./steps/UclTeamStep";
import { ChoiceStep } from "./ChoiceStep";
import { BounceCheck } from "./BounceCheck";
import { welcomeVariants, sharpVariants } from "./transitions";

type StepId =
  | "welcome"
  | "photo"
  | "name"
  | "bounce-profile"
  | "quiz-age"
  | "quiz-knowledge"
  | "quiz-messi"
  | "quiz-superlig"
  | "quiz-uclteam"
  | "quiz-device"
  | "bounce-survey";

const FULL_ORDER: StepId[] = [
  "welcome",
  "photo",
  "name",
  "bounce-profile",
  "quiz-age",
  "quiz-knowledge",
  "quiz-messi",
  "quiz-superlig",
  "quiz-uclteam",
  "quiz-device",
  "bounce-survey",
];

const MESSI_RONALDO_OPTIONS: MessiOrRonaldo[] = ["messi", "ronaldo", "no-opinion"];
const DEVICE_OPTIONS: Device[] = ["phone", "desktop", "both"];

const AGE_MIN = 10;
const AGE_MAX = 90;
const AGE_DEFAULT = 25;

interface SignupFlowProps {
  uid: string;
  onDone: () => void;
}

/**
 * The full post-signup sequence: welcome -> photo -> name -> "profile done"
 * bounce -> six-question quiz -> "signed up" bounce -> onDone (ProfileGate
 * then renders the real app). One continuous animated overlay, not a page
 * navigation — matches ProfileGate's existing "block children until ready"
 * pattern, just replacing its old bare ProfileForm.
 *
 * Always starts at "welcome", even on a reload mid-flow — abandoning
 * partway through (closing the tab, reloading) cancels the whole signup
 * rather than resuming later (Mert's explicit call). ProfileGate.tsx backs
 * this: it doesn't treat "has a profile but no survey yet" as a resumable
 * state, it just re-renders SignupFlow from scratch — the eventual
 * saveProfile/saveSurveyResponse calls below overwrite whatever stale
 * profile/photo a prior abandoned attempt left behind, no explicit cleanup
 * needed.
 */
export function SignupFlow({ uid, onDone }: SignupFlowProps) {
  const order = FULL_ORDER;
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [age, setAge] = useState(AGE_DEFAULT);
  const [footballKnowledge, setFootballKnowledge] = useState<number | null>(null);
  const [messiOrRonaldo, setMessiOrRonaldo] = useState<MessiOrRonaldo | null>(null);
  const [superLigTeam, setSuperLigTeam] = useState<string | null>(null);
  const [uclTeam, setUclTeam] = useState<string | null>(null);

  const step = order[index];

  function advance() {
    setIndex((i) => i + 1);
  }

  async function handleNameSubmit(firstName: string, lastName: string) {
    if (!photoFile || saving) return;
    setSaving(true);
    setError(null);
    try {
      await saveProfile(uid, firstName, lastName, photoFile);
      setSaving(false);
      advance();
    } catch (err) {
      console.error("Signup profile save failed", err);
      setSaving(false);
      setError("Profil kaydedilemedi, tekrar deneyin.");
    }
  }

  async function handleDeviceSelect(device: Device) {
    if (saving) return;
    setSaving(true);
    setError(null);
    const response: SurveyResponse = {
      age,
      footballKnowledge: footballKnowledge!,
      messiOrRonaldo: messiOrRonaldo!,
      superLigTeam: superLigTeam!,
      uclTeam,
      device,
      submittedAt: Date.now(),
    };
    try {
      await saveSurveyResponse(uid, response);
      setSaving(false);
      advance();
    } catch (err) {
      console.error("Signup survey save failed", err);
      setSaving(false);
      setError("Cevapların kaydedilemedi, tekrar deneyin.");
    }
  }

  if (!step) return null;

  const variants = step === "welcome" ? welcomeVariants : sharpVariants;

  return (
    // h-dvh, not h-full — this renders outside AppShell (ProfileGate sits
    // above it, see App.tsx), so there's no ancestor guaranteed to carry a
    // resolved height down through a plain %-chain. AppShell.tsx uses the
    // same dvh unit for exactly this reason. Relying on h-full here measured
    // stale on first paint (content sat slightly below center until
    // something forced a reflow, e.g. an F11 toggle) — dvh tracks the real
    // viewport directly instead of inheriting through html/body/#root.
    <div className="relative flex h-dvh w-full cursor-default items-center justify-center overflow-hidden bg-background px-6 py-10">
      {/* Always mounted (outside AnimatePresence's per-step swap) so it
          persists across every step, just changing width — a minimal,
          constant sense of progress rather than something that resets or
          flickers between steps. */}
      <div
        aria-hidden
        className="absolute top-10 left-1/2 h-1 w-64 -translate-x-1/2 overflow-hidden rounded-full bg-ink/10"
      >
        <div
          className="h-full rounded-full bg-ink transition-[width] duration-500 ease-[var(--ease-cotton)]"
          style={{ width: `${((index + 1) / order.length) * 100}%` }}
        />
      </div>
      <AnimatePresence mode="wait">
        {/* max-h + overflow-y-auto is the actual bound — nothing here was
            genuinely constrained before this (the outer h-dvh clips, it
            doesn't shrink content to fit), which is exactly how the UCL
            grid step ended up spilling past the viewport once its sizing
            grew. Shrinks to its natural content size when that fits, same
            as before; only engages as a scroll fallback when it doesn't. */}
        <motion.div
          key={step}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="no-scrollbar flex max-h-[calc(100dvh-5rem)] w-full flex-col items-center overflow-y-auto"
        >
          {step === "welcome" && (
            <AutoAdvance delayMs={2600} onDone={advance}>
              <WelcomeStep />
            </AutoAdvance>
          )}

          {step === "photo" && (
            <PhotoStep
              onSelect={(file) => {
                setPhotoFile(file);
                advance();
              }}
            />
          )}

          {step === "name" && <NameStep onSubmit={handleNameSubmit} disabled={saving} />}

          {step === "bounce-profile" && (
            <AutoAdvance delayMs={2000} onDone={advance}>
              <BounceCheck text="Tamamdır! Şimdi sana birkaç sorumuz var." />
            </AutoAdvance>
          )}

          {step === "quiz-age" && (
            <AgeRollerStep
              min={AGE_MIN}
              max={AGE_MAX}
              defaultValue={AGE_DEFAULT}
              onConfirm={(value) => {
                setAge(value);
                advance();
              }}
            />
          )}

          {step === "quiz-knowledge" && (
            <ChoiceStep
              question="Futbol bilgini nasıl değerlendirirsin?"
              options={FOOTBALL_KNOWLEDGE_OPTIONS.map((o) => ({
                value: String(o.value),
                label: `${o.value}. ${o.label}`,
              }))}
              onSelect={(value) => {
                setFootballKnowledge(Number(value));
                advance();
              }}
            />
          )}

          {step === "quiz-messi" && (
            <ChoiceStep
              question="Messi mi Ronaldo mu?"
              options={MESSI_RONALDO_OPTIONS.map((v) => ({ value: v, label: MESSI_RONALDO_LABEL[v] }))}
              onSelect={(value) => {
                setMessiOrRonaldo(value as MessiOrRonaldo);
                advance();
              }}
            />
          )}

          {step === "quiz-superlig" && (
            <ChoiceStep
              question="Süper Lig'de hangi takımı tutuyorsun?"
              options={SUPER_LIG_TEAMS.map((t) => ({ value: t, label: t }))}
              onSelect={(value) => {
                setSuperLigTeam(value);
                advance();
              }}
            />
          )}

          {step === "quiz-uclteam" && (
            <UclTeamStep
              onSelect={(teamId) => {
                setUclTeam(teamId);
                advance();
              }}
            />
          )}

          {step === "quiz-device" && (
            <ChoiceStep
              question="Bu siteyi genellikle telefonda mı masaüstünde mi kullanacaksın?"
              options={DEVICE_OPTIONS.map((v) => ({ value: v, label: DEVICE_LABEL[v] }))}
              disabled={saving}
              onSelect={(value) => handleDeviceSelect(value as Device)}
            />
          )}

          {step === "bounce-survey" && (
            <AutoAdvance delayMs={2000} onDone={onDone}>
              <BounceCheck text="Kayıt başarılı!" />
            </AutoAdvance>
          )}
        </motion.div>
      </AnimatePresence>

      {error && (
        <p
          role="alert"
          className="absolute bottom-8 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
}

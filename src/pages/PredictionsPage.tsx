import { useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useVisibilityState } from "../state/useVisibilityState";
import { isPageAllowed } from "../state/pageAccess";
import { usePrediction, savePrediction } from "../predictions/usePrediction";
import { TeamRanker } from "../predictions/TeamRanker";
import { SubmissionCounter } from "../predictions/SubmissionCounter";
import { TEAMS } from "../predictions/teams";
import { RankingList } from "../predictions/RankingList";
import { Prediction } from "../predictions/predictionTypes";

type UiStep = "idle" | "rank" | "confirm-overwrite";

export function PredictionsPage() {
  const { user } = useAuth();
  const state = useVisibilityState();
  const { prediction, loading } = usePrediction(user?.uid ?? null);
  const [uiStep, setUiStep] = useState<UiStep>("idle");
  const [pendingOrder, setPendingOrder] = useState<string[] | null>(null);
  const [saved, setSaved] = useState<Prediction | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isPageAllowed("predictions", state)) {
    return <p>This section isn't available right now.</p>;
  }

  if (loading) return null;

  const currentPrediction = saved ?? prediction;
  const uid = user!.uid;

  // Preserves the exact pre-refactor behavior (locked once "started", editable
  // before) — the nuanced unlock-during-preknockout schedule described in
  // onboarding/pagemap-questionnaires/pagemap-round-01.md (Q8) is a real,
  // still-open follow-up, not implemented here.
  if (state !== "loggedin_notstarted") {
    if (!currentPrediction) {
      return <p>Bir tahmin göndermediniz.</p>;
    }
    return <RankingList ranking={currentPrediction.ranking} />;
  }

  // state === "loggedin_notstarted" from here down. The survey used to be
  // gated here (first-ever submit) — it's now mandatory at sign-up instead
  // (ProfileGate/SignupFlow), so reaching this page with no prediction yet
  // goes straight to ranking, same as re-ranking an existing one.
  if (uiStep === "rank" || (!currentPrediction && uiStep === "idle")) {
    const initialOrder = currentPrediction ? currentPrediction.ranking : TEAMS.map((t) => t.id);
    return (
      <div>
        <TeamRanker
          teams={TEAMS}
          initialOrder={initialOrder}
          onSubmit={(order) => {
            if (currentPrediction) {
              setPendingOrder(order);
              setError(null);
              setUiStep("confirm-overwrite");
            } else {
              void (async () => {
                try {
                  const result = await savePrediction(uid, order);
                  setSaved(result);
                  setError(null);
                  setUiStep("idle");
                } catch (err) {
                  console.error("Failed to submit prediction", err);
                  setError("Tahmininiz kaydedilemedi, tekrar deneyin.");
                }
              })();
            }
          }}
        />
        {error && <p role="alert">{error}</p>}
      </div>
    );
  }

  if (uiStep === "confirm-overwrite" && pendingOrder) {
    return (
      <div role="dialog">
        <p>Bu tahmini üzerine yazmak istediğinize emin misiniz?</p>
        <button
          onClick={async () => {
            try {
              const result = await savePrediction(uid, pendingOrder);
              setSaved(result);
              setPendingOrder(null);
              setError(null);
              setUiStep("idle");
            } catch (err) {
              console.error("Failed to submit prediction", err);
              setError("Tahmininiz kaydedilemedi, tekrar deneyin.");
            }
          }}
        >
          Evet, kaydet
        </button>
        <button
          onClick={() => {
            setPendingOrder(null);
            setError(null);
            setUiStep("idle");
          }}
        >
          Vazgeç
        </button>
        {error && <p role="alert">{error}</p>}
      </div>
    );
  }

  // uiStep === "idle" && currentPrediction exists: read/edit view
  return (
    <div>
      <RankingList ranking={currentPrediction!.ranking} />
      <button
        onClick={() => {
          setError(null);
          setUiStep("rank");
        }}
      >
        Düzenle
      </button>
      <SubmissionCounter />
    </div>
  );
}

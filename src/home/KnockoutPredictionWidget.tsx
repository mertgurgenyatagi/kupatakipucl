import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Frame, FrameBody } from "@/components/ui/frame";
import { useCountdown } from "./useCountdown";
import { KNOCKOUT_PREDICTION_DEADLINE_ISO } from "./deadlines";
import { useAuth } from "../auth/AuthProvider";
import { useKnockoutPrediction } from "../knockout/useKnockoutPrediction";

/** Two-digit zero-padded number for countdown tiles. */
function Tile({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="font-mono text-xl font-bold leading-none text-color_text tnum tabular-nums">
        {String(value).padStart(2, "0")}
      </span>
      <span className="font-mono text-[0.58rem] tracking-[0.12em] text-color_textsecondary uppercase">
        {label}
      </span>
    </div>
  );
}

/**
 * Shown on the preknockout home page only, above the Sohbet card.
 * Counts down to the knockout-prediction submission deadline and links
 * to the (forthcoming) /knockout-predictions page.
 * Disappears once the user has submitted their knockout prediction.
 */
export function KnockoutPredictionWidget() {
  const { user } = useAuth();
  const { prediction, loading } = useKnockoutPrediction(user?.uid ?? null);
  const { days, hours, minutes, seconds, done } = useCountdown(
    KNOCKOUT_PREDICTION_DEADLINE_ISO
  );

  if (loading || Boolean(prediction)) {
    return null;
  }

  return (
    <div className="shrink-0" style={{ flexBasis: "30%" }}>
      <Frame className="shrink-0 animate-cotton-rise border-color_border1/35 border-color_accent/30"
        style={{ animationDelay: "240ms" }}>
      <FrameBody className="flex flex-col justify-between gap-3 px-5 py-4">
        {/* Label row */}
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[0.6rem] tracking-[0.14em] text-color_accent uppercase">
            Eleme Aşaması
          </span>
          <span className="font-display text-sm font-semibold leading-snug text-color_text">
            Tahminlerini&nbsp;yap
          </span>
        </div>

        {/* Countdown */}
        <div className="flex items-end justify-center gap-3">
          {done ? (
            <span className="font-mono text-xs text-color_textsecondary">
              Süre doldu
            </span>
          ) : (
            <>
              {days > 0 && <Tile value={days} label="gün" />}
              {(days > 0 || hours > 0) && (
                <>
                  {days > 0 && (
                    <span className="mb-2.5 font-mono text-sm font-bold text-color_textsecondary">
                      :
                    </span>
                  )}
                  <Tile value={hours} label="saat" />
                </>
              )}
              <span className="mb-2.5 font-mono text-sm font-bold text-color_textsecondary">
                :
              </span>
              <Tile value={minutes} label="dk" />
              <span className="mb-2.5 font-mono text-sm font-bold text-color_textsecondary">
                :
              </span>
              <Tile value={seconds} label="sn" />
            </>
          )}
        </div>

        {/* CTA */}
        <Link
          to="/knockout-predictions"
          className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full bg-color_accent px-4 py-2.5 text-xs font-bold text-background shadow-md transition-all duration-150 ease-[var(--ease-cotton)] hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-color_accent"
        >
          Tahminlere git
          <ArrowRight className="size-3.5" />
        </Link>
      </FrameBody>
    </Frame>
    </div>
  );
}

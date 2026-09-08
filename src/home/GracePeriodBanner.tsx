import { Link } from "react-router-dom";
import { LoginButton } from "../auth/LoginButton";
import { useCountdown } from "./useCountdown";
import { PREDICTION_GRACE_END_ISO } from "./deadlines";
import { Frame } from "@/components/ui/frame";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Compact strip announcing the 2026-09-08 grace period (deadlines.ts) — 3
 *  days into the league phase where a first-ever sign-up or first-ever
 *  prediction submission is still possible. Callers own all the gating
 *  (phase === "leaguephase", useGracePeriodOpen(), and — for the logged-in
 *  variant — "hasn't submitted yet"); this only renders the strip once told
 *  to, so it never needs to know any of that itself. */
export function GracePeriodBanner({
  variant,
  className,
}: {
  variant: "loggedout" | "loggedin";
  className?: string;
}) {
  const countdown = useCountdown(PREDICTION_GRACE_END_ISO);

  return (
    <Frame className={cn("shrink-0 animate-cotton-rise", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <p className="font-display text-sm text-color_text">
          {variant === "loggedout"
            ? "Kayıt olmak ve tahmin göndermek için son şansın: "
            : "Tahminini göndermek için son şansın: "}
          <span className="font-semibold text-color_gold tnum">
            {countdown.days}g {countdown.hours}s {countdown.minutes}dk
          </span>
        </p>
        {variant === "loggedout" ? (
          <div className="[&_button]:flex [&_button]:cursor-pointer [&_button]:items-center [&_button]:gap-2 [&_button]:rounded-full [&_button]:bg-color_text [&_button]:px-4 [&_button]:py-2 [&_button]:text-sm [&_button]:font-semibold [&_button]:text-background [&_[role=alert]]:mt-1.5 [&_[role=alert]]:text-xs [&_[role=alert]]:text-color_remove">
            <LoginButton />
          </div>
        ) : (
          <Link to="/predictions" className={cn(buttonVariants({ variant: "default", size: "sm" }))}>
            Tahmininizi gönderin
          </Link>
        )}
      </div>
    </Frame>
  );
}

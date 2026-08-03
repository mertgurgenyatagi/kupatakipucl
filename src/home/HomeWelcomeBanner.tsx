import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Frame, FrameBody } from "@/components/ui/frame";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useCountdown } from "./useCountdown";
import { TOURNAMENT_START_ISO } from "./deadlines";
import { initials } from "../profile/deletedAccount";
import type { Player } from "../profile/usePlayers";

interface HomeWelcomeBannerProps {
  me: Player;
  /** Whether to show the "Tahminini Yap" CTA. HomeLandingLoggedIn passes
   *  `!submitterUids.has(me.uid)` (predictions still open); the started
   *  page passes `false` unconditionally, since /predictions redirects
   *  home for anyone visiting once the tournament has started, regardless
   *  of submission status. */
  showCta: boolean;
}

function MiniCountdownDigit({ value, label }: { value: number; label: string }) {
  return (
    <span className="flex items-baseline gap-1.5 whitespace-nowrap">
      <span className="font-display text-2xl leading-none font-semibold text-color_text tnum sm:text-3xl">
        {String(value).padStart(2, "0")}
      </span>
      <span className="font-mono text-xs tracking-[0.1em] text-color_textsecondary uppercase">{label}</span>
    </span>
  );
}

/**
 * Personal welcome + primary action + countdown — one frame, no title band
 * (Home's "no widget carries a label" rule applies to the greeting too).
 * Shared between HomeLandingLoggedIn (not-started) and
 * HomeLandingLoggedInStarted (league phase) — identical treatment on both,
 * per the started page's own wireframe note ("welcome message, same as
 * logged in not started").
 */
export function HomeWelcomeBanner({ me, showCta }: HomeWelcomeBannerProps) {
  const countdown = useCountdown(TOURNAMENT_START_ISO);

  return (
    <Frame className="shrink-0 animate-cotton-rise">
      <FrameBody className="flex flex-col gap-5 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-center gap-3.5">
          <Avatar className="size-14 shrink-0">
            <AvatarImage src={me.photoURL} alt="" />
            <AvatarFallback className="font-mono text-sm text-color_textsecondary">
              {initials(me)}
            </AvatarFallback>
          </Avatar>
          <p className="min-w-0 truncate font-display text-xl text-color_text sm:text-2xl">
            Hoş geldin, <span className="font-bold">{me.firstName}</span>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 sm:gap-8">
          {showCta && (
            <Link
              to="/predictions"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-color_text px-6 py-3 text-sm font-semibold text-background outline-none transition-all duration-150 ease-[var(--ease-cotton)] hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-color_accent"
            >
              Tahminini Yap
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          )}

          {!countdown.done && (
            <div className="flex items-baseline gap-4 whitespace-nowrap">
              <span className="font-mono text-xs tracking-[0.12em] text-color_textsecondary uppercase">
                Tahminlerin Kapanmasına
              </span>
              <div className="flex items-baseline gap-3.5">
                <MiniCountdownDigit value={countdown.days} label="Gün" />
                <MiniCountdownDigit value={countdown.hours} label="Saat" />
                <MiniCountdownDigit value={countdown.minutes} label="Dk" />
                <MiniCountdownDigit value={countdown.seconds} label="Sn" />
              </div>
            </div>
          )}
        </div>
      </FrameBody>
    </Frame>
  );
}

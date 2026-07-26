import { motion, useReducedMotion, type Variants } from "motion/react";
import { LoginButton } from "../auth/LoginButton";
import { AvatarStack } from "./AvatarStack";
import { DustHaze } from "./DustHaze";
import { SlotNumber } from "./SlotNumber";
import { useCountdown } from "./useCountdown";
import { useIrregularCounter } from "./useIrregularCounter";
import { TOURNAMENT_START_ISO } from "./deadlines";
import type { Player } from "../profile/usePlayers";

// What it is, how scoring works, when it happens — in that order, kept
// deliberately brief and non-technical (no |predicted-actual|<3 formula
// here; that belongs on a dedicated rules page, per SPEC.md §9).
const MISSION_COPY =
  "Lig aşaması başlamadan önce 36 takımı, tahmin sırana göre diz. Tahminin gerçek tabloya ne kadar yakınsa, o kadar çok puan kazanırsın. Kayıtlar kapanınca tahminler kilitlenir — gerisi, sonuçları izlemek.";

// Matches --ease-cotton (src/styles/index.css) so this reveal and a CSS-
// keyframe one elsewhere (e.g. TeamTable's own animate-cotton-rise rows)
// feel like the same system rather than two different animation vocabularies.
const EASE_COTTON = [0.22, 0.61, 0.36, 1] as const;

const riseIn: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_COTTON } },
};

const staggerGroup: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.08 } },
};

/** A single Google CTA, restyled per call site via the same wrapper-targets-
 *  the-inner-button pattern AppShell.tsx already uses for the top-bar one —
 *  LoginButton itself stays a single, unstyled source of truth for the
 *  actual sign-in call. */
function SignupCta({ tone }: { tone: "primary" | "outline" }) {
  const toneClass =
    tone === "primary"
      ? "[&_button]:bg-ink [&_button]:text-background hover:[&_button]:scale-[1.03]"
      : "[&_button]:border [&_button]:border-navy-line [&_button]:text-navy-ink hover:[&_button]:border-brass";
  return (
    <div
      className={`[&_button]:flex [&_button]:cursor-pointer [&_button]:items-center [&_button]:gap-2.5 [&_button]:rounded-full [&_button]:px-6 [&_button]:py-3.5 [&_button]:text-sm [&_button]:font-semibold [&_button]:transition-transform [&_button]:duration-150 [&_button]:ease-[var(--ease-cotton)] [&_svg]:size-[1.05rem] [&_[role=alert]]:mt-2 [&_[role=alert]]:text-xs [&_[role=alert]]:text-destructive ${toneClass}`}
    >
      <LoginButton />
    </div>
  );
}

function CountdownDigit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="font-display text-3xl font-semibold text-navy-ink tnum sm:text-4xl">
        {String(value).padStart(2, "0")}
      </span>
      <span className="font-mono text-[0.6rem] tracking-[0.22em] text-navy-muted uppercase">{label}</span>
    </div>
  );
}

interface HomeLandingLoggedOutProps {
  players: Player[];
}

/**
 * Home, logged-out + not-started — the one page a logged-out visitor sees
 * pre-launch. Single screen, no scroll (Mert's explicit call): the hero
 * band (DustHaze) is the only section now — the Mission and Countdown
 * copy that used to anchor their own stacked SplitBand sections below live
 * on the hero's right side instead, and the team-roster section (TeamTable)
 * is dropped entirely. No portrait photos on this page anymore either —
 * SplitBand and its curved image panels went with the two removed sections.
 */
export function HomeLandingLoggedOut({ players }: HomeLandingLoggedOutProps) {
  const countdown = useCountdown(TOURNAMENT_START_ISO);
  const liveCount = useIrregularCounter(players.length);
  const reduceMotion = useReducedMotion();
  const initial = reduceMotion ? "visible" : "hidden";

  return (
    <section className="relative flex h-full min-h-0 flex-1 items-center overflow-hidden bg-background">
      <DustHaze />
      <div className="absolute inset-0 bg-linear-to-t from-background via-background/40 to-transparent" />

      <motion.div
        initial={initial}
        animate="visible"
        variants={staggerGroup}
        className="relative z-10 mx-auto grid w-full max-w-[1400px] grid-cols-1 items-center gap-10 px-6 sm:px-10 lg:grid-cols-[3fr_2fr] lg:gap-16"
      >
        <div className="flex flex-col gap-6">
          <motion.h1
            variants={riseIn}
            className="max-w-3xl text-balance font-display text-4xl leading-[0.98] font-semibold tracking-[-0.02em] text-ink sm:text-5xl lg:text-6xl"
          >
            36 takım. <SlotNumber value={liveCount} /> katılımcı. 1 turnuva.
          </motion.h1>
          <motion.p variants={riseIn} className="max-w-xl text-base text-navy-muted sm:text-lg">
            Şampiyonlar Ligi nasıl ilerleyecek? Tahminini yap, arkadaşlarınla aynı tabloda yarış.
          </motion.p>

          <motion.div variants={riseIn} className="flex flex-wrap items-center gap-6 pt-2">
            <SignupCta tone="primary" />
            {players.length > 0 && (
              <div className="flex items-center gap-3">
                <AvatarStack players={players} />
                <span className="font-mono text-xs text-navy-muted">{players.length} kişi katıldı</span>
              </div>
            )}
          </motion.div>
        </div>

        <motion.div variants={riseIn} className="flex flex-col gap-7 lg:border-l lg:border-navy-line/30 lg:pl-12">
          <p className="text-balance font-display text-lg leading-snug text-ink sm:text-xl">{MISSION_COPY}</p>

          <div className="flex flex-col gap-4">
            <span className="font-mono text-[0.62rem] tracking-[0.28em] text-navy-muted uppercase">
              Kayıtların Kapanmasına
            </span>
            <div className="flex items-start gap-5 sm:gap-7">
              <CountdownDigit value={countdown.days} label="Gün" />
              <CountdownDigit value={countdown.hours} label="Saat" />
              <CountdownDigit value={countdown.minutes} label="Dakika" />
              <CountdownDigit value={countdown.seconds} label="Saniye" />
            </div>
            <div className="pt-1">
              <SignupCta tone="outline" />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

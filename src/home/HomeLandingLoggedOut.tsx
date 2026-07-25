import { motion, useReducedMotion, type Variants } from "motion/react";
import { TeamTable } from "../leaderboard/TeamTable";
import { HERO_IMAGES } from "../leaderboard/HeroCarousel";
import { LoginButton } from "../auth/LoginButton";
import { AvatarStack } from "./AvatarStack";
import { WaveDivider } from "./WaveDivider";
import { DustHaze } from "./DustHaze";
import { SplitBand } from "./SplitBand";
import { SlotNumber } from "./SlotNumber";
import { useCountdown } from "./useCountdown";
import { useIrregularCounter } from "./useIrregularCounter";
import { TOURNAMENT_START_ISO } from "./deadlines";
import type { Player } from "../profile/usePlayers";
import type { TeamResult } from "../leaderboard/teamResultTypes";

// What it is, how scoring works, when it happens — in that order, kept
// deliberately brief and non-technical (no |predicted-actual|<3 formula
// here; that belongs on a dedicated rules page, per SPEC.md §9).
const MISSION_COPY =
  "Lig aşaması başlamadan önce 36 takımı, tahmin sırana göre diz. Tahminin gerçek tabloya ne kadar yakınsa, o kadar çok puan kazanırsın. Kayıtlar kapanınca tahminler kilitlenir — gerisi, sonuçları izlemek.";

// Matches --ease-cotton (src/styles/index.css) so a motion-driven reveal and
// a CSS-keyframe one (e.g. TeamTable's own animate-cotton-rise rows) feel
// like the same system rather than two different animation vocabularies.
const EASE_COTTON = [0.22, 0.61, 0.36, 1] as const;

const riseIn: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_COTTON } },
};

const staggerGroup: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.08 } },
};

const inViewport = { once: true, amount: 0.4 } as const;

/** A single Google CTA, restyled per call site via the same wrapper-targets-
 *  the-inner-button pattern AppShell.tsx already uses for the top-bar one —
 *  LoginButton itself stays a single, unstyled source of truth for the
 *  actual sign-in call. */
function SignupCta({ tone }: { tone: "primary" | "outline" }) {
  const toneClass =
    tone === "primary"
      ? "[&_button]:bg-ink [&_button]:text-background hover:[&_button]:-translate-y-0.5"
      : "[&_button]:border [&_button]:border-navy-line [&_button]:text-navy-ink hover:[&_button]:border-brass";
  return (
    <div
      className={`[&_button]:flex [&_button]:cursor-pointer [&_button]:items-center [&_button]:gap-2.5 [&_button]:rounded-full [&_button]:px-6 [&_button]:py-3.5 [&_button]:text-sm [&_button]:font-semibold [&_button]:transition-all [&_button]:duration-150 [&_button]:ease-[var(--ease-cotton)] [&_svg]:size-[1.05rem] [&_[role=alert]]:mt-2 [&_[role=alert]]:text-xs [&_[role=alert]]:text-destructive ${toneClass}`}
    >
      <LoginButton />
    </div>
  );
}

function CountdownDigit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="font-display text-4xl font-semibold text-navy-ink tnum sm:text-5xl">
        {String(value).padStart(2, "0")}
      </span>
      <span className="font-mono text-[0.6rem] tracking-[0.22em] text-navy-muted uppercase">{label}</span>
    </div>
  );
}

interface HomeLandingLoggedOutProps {
  players: Player[];
  results: Record<string, TeamResult>;
}

/**
 * Home, logged-out + not-started — the one page a logged-out visitor sees
 * pre-launch, and the one place PAGE_BRIEFING.txt explicitly says to drop
 * the rest of the site's frame/widget idiom entirely ("let go on the
 * intuitiveness and widget approach completely here... meant to be cool and
 * slick"). Stacked full-bleed bands with curved seams instead of the
 * Frame/bento composition every other page uses.
 *
 * Below the hero, every band is a left-content/right-image split (SplitBand)
 * per Mert's iteration round — the three portrait photos that used to loop
 * in the hero now each anchor one section instead, and the hero itself runs
 * DustHaze (an abstract dark/blue haze) rather than a photo.
 *
 * Deliberately its own internal scroll region (the one exception to the
 * app-wide fixed-viewport rule, DESIGN-SPEC §55) — a stacked landing page
 * doesn't fit "everything visible with no scroll," and §55 itself only
 * requires *an* internal scroll container for content that overflows, not
 * that every page avoid one.
 */
export function HomeLandingLoggedOut({ players, results }: HomeLandingLoggedOutProps) {
  const countdown = useCountdown(TOURNAMENT_START_ISO);
  const liveCount = useIrregularCounter(players.length);
  const reduceMotion = useReducedMotion();
  const initial = reduceMotion ? "visible" : "hidden";

  return (
    <div className="no-scrollbar relative min-h-0 flex-1 overflow-y-auto">
      {/* ---- Hero ---------------------------------------------------------- */}
      <section className="relative flex h-[86vh] min-h-[560px] w-full items-end overflow-hidden bg-background">
        <DustHaze />
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/40 to-transparent" />

        <motion.div
          initial={initial}
          animate="visible"
          variants={staggerGroup}
          className="relative z-10 mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-6 pb-16 sm:px-10 lg:pb-20"
        >
          <motion.h1
            variants={riseIn}
            className="max-w-3xl text-balance font-display text-5xl leading-[0.98] font-semibold tracking-[-0.02em] text-ink sm:text-6xl lg:text-7xl"
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
        </motion.div>
      </section>

      <WaveDivider fill="var(--background)" />

      {/* ---- Mission --------------------------------------------------------- */}
      <SplitBand image={HERO_IMAGES[0]}>
        <motion.div
          initial={initial}
          whileInView="visible"
          viewport={inViewport}
          variants={staggerGroup}
          className="flex max-w-md flex-col gap-4"
        >
          <motion.p variants={riseIn} className="text-balance font-display text-2xl leading-snug text-ink sm:text-3xl">
            {MISSION_COPY}
          </motion.p>
        </motion.div>
      </SplitBand>

      <WaveDivider fill="var(--navy)" />

      {/* ---- Countdown --------------------------------------------------------- */}
      <SplitBand image={HERO_IMAGES[1]} tone="navy" imagePosition="left">
        <motion.div
          initial={initial}
          whileInView="visible"
          viewport={inViewport}
          variants={staggerGroup}
          className="flex flex-col items-start gap-8"
        >
          <motion.span
            variants={riseIn}
            className="font-mono text-[0.62rem] tracking-[0.28em] text-navy-muted uppercase"
          >
            Kayıtların Kapanmasına
          </motion.span>
          <motion.div variants={riseIn} className="flex items-start gap-6 sm:gap-10">
            <CountdownDigit value={countdown.days} label="Gün" />
            <CountdownDigit value={countdown.hours} label="Saat" />
            <CountdownDigit value={countdown.minutes} label="Dakika" />
            <CountdownDigit value={countdown.seconds} label="Saniye" />
          </motion.div>
          <motion.div variants={riseIn}>
            <SignupCta tone="outline" />
          </motion.div>
        </motion.div>
      </SplitBand>

      <WaveDivider fill="var(--background)" flip />

      {/* ---- Team roster --------------------------------------------------------- */}
      <SplitBand image={HERO_IMAGES[2]} ratio="3fr 2fr">
        <motion.div
          initial={initial}
          whileInView="visible"
          viewport={inViewport}
          variants={staggerGroup}
          className="flex min-h-0 flex-col gap-6"
        >
          <motion.span
            variants={riseIn}
            className="font-mono text-[0.62rem] tracking-[0.28em] text-muted-foreground uppercase"
          >
            36 Takım, Hepsi 0 Puan
          </motion.span>
          <motion.div variants={riseIn} className="h-[560px] w-full">
            <TeamTable results={results} />
          </motion.div>
        </motion.div>
      </SplitBand>
    </div>
  );
}

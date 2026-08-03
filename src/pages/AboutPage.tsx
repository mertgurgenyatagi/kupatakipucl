import { Fragment } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { DustHaze } from "../home/DustHaze";
import { TOURNAMENT_START_ISO } from "../home/deadlines";
import { cn } from "@/lib/utils";

// Matches --ease-cotton (src/styles/index.css) / HomeLandingLoggedOut.tsx's
// own copy of the same curve, so every page's motion reads as one system.
const EASE_COTTON = [0.22, 0.61, 0.36, 1] as const;

// Encyclopedic, not dramatic (explicit call) — a single paragraph that
// assumes no prior knowledge: what the site is, who it's for, exactly how
// scoring works, and what else the site includes beyond the prediction
// itself.
const ESSENCE_TEXT =
  "Kupatakip, Şampiyonlar Ligi için bir tahmin oyunudur: turnuva başlamadan önce 36 takım tahmin sırasına göre dizilir ve tahmin edilen sıra gerçek sıradan en fazla iki basamak sapıyorsa o takımdan üç puan, otuz altı takımın tamamı isabetliyse toplamda yüz sekiz puan kazanılır; eleme aşamasında ise çeyrek finalistler üç, yarı finalistler dört, finalistler beş, şampiyon altı puan getirir. Puanlar tek bir puan durumu tablosunda toplanır; site ayrıca bir forum, genel ve özel lobi sohbetlerini, takım/katılımcı detay pencerelerini ve bir istatistik sayfasını içerir.";

// Real, fixed UEFA-format dates (the project's own hard-dates record).
// TOURNAMENT_START_ISO is the only one with a live consumer elsewhere
// (src/home/deadlines.ts) — the others have no other consumer yet, same
// situation that constant was in before it got its own file. The last
// entry's date is a rough placeholder (Mert: "not important, dates will
// be changed anyway") — there's no real knockout-phase-end date fixed
// yet, unlike the other five.
const KEY_DATES: { label: string; date: Date }[] = [
  { label: "Lig Tahminleri Açılır", date: new Date("2026-08-26T00:00:00+03:00") },
  { label: "Lig Tahminleri Kapanır", date: new Date(TOURNAMENT_START_ISO) },
  { label: "Lig Aşaması", date: new Date("2027-01-27T00:00:00+03:00") },
  { label: "Eleme Tahminleri Açılır", date: new Date("2027-02-26T00:00:00+03:00") },
  { label: "Eleme Tahminleri Kapanır", date: new Date("2027-03-09T00:00:00+03:00") },
  { label: "Eleme Aşaması", date: new Date("2027-05-30T00:00:00+03:00") },
];

const TR_MONTHS_SHORT = [
  "Oca",
  "Şub",
  "Mar",
  "Nis",
  "May",
  "Haz",
  "Tem",
  "Ağu",
  "Eyl",
  "Eki",
  "Kas",
  "Ara",
];

function formatChipDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")} ${TR_MONTHS_SHORT[d.getMonth()]}`;
}

type DateStatus = "past" | "current" | "future";

function getDateStatus(date: Date, now: number, currentThreshold: number | null): DateStatus {
  if (date.getTime() < now) return "past";
  if (currentThreshold !== null && date.getTime() === currentThreshold) return "current";
  return "future";
}

const logoIn: Variants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE_COTTON } },
};

// A single fade/rise, not a word-by-word stagger — the essence text is now
// a full encyclopedic paragraph, and staggering ~140 individual words would
// take several seconds to finish revealing. It also used to animate
// font-weight (thin -> resting) per word, which looked unstable: that ran
// concurrently with the actual Inter Variable font file finishing its
// swap-in, so the text could visibly change font *and* weight-interpolate
// at the same time right as the page opened.
const essenceIn: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_COTTON, delay: 0.3 } },
};
const timelineIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6, ease: EASE_COTTON, delay: 1.1 } },
};
const contactIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6, ease: EASE_COTTON, delay: 1.5 } },
};

// A stepper, not a decoration: the 5 dates are a genuine chronological
// sequence (signup close → league start → league end → RO16 draw → RO16
// start). Past nodes are filled, the next upcoming one blinks as the
// current stage, everything after it stays hollow/future.
function DateTimeline() {
  const now = Date.now();
  const upcoming = KEY_DATES.find((item) => item.date.getTime() >= now);
  const currentThreshold = upcoming ? upcoming.date.getTime() : null;

  return (
    <div className="flex w-full max-w-3xl items-start">
      {KEY_DATES.map((item, i) => {
        const status = getDateStatus(item.date, now, currentThreshold);
        const isFuture = status === "future";
        const isCurrent = status === "current";
        return (
          <Fragment key={item.label}>
            {i > 0 && <div aria-hidden className="mt-2.5 h-px flex-1 bg-color_border1" />}
            <div className="flex flex-col items-center gap-3">
              <span
                className={cn(
                  "size-5 shrink-0 rounded-full",
                  isFuture ? "border-2 border-color_text bg-transparent" : "bg-color_text",
                  isCurrent && "animate-pulse"
                )}
              />
              <span
                className={cn(
                  "tnum font-display text-lg font-semibold",
                  isFuture ? "text-color_textsecondary" : "text-color_text",
                  isCurrent && "animate-pulse"
                )}
              >
                {formatChipDate(item.date)}
              </span>
              <span
                className={cn(
                  "max-w-[5.5rem] text-center font-mono text-[0.58rem] leading-tight tracking-[0.1em] uppercase",
                  isFuture ? "text-color_textsecondary/70" : "text-color_textsecondary",
                  isCurrent && "animate-pulse"
                )}
              >
                {item.label}
              </span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

/**
 * /about — static across every VisibilityState (no gating). Single
 * no-scroll viewport, desktop-only (mobile deliberately not tuned here).
 * Two-column poster composition per Mert's own wireframe: centered,
 * matter-of-fact essence text + contact info on the left, giant logo + a
 * real-sequence date timeline on the right.
 */
export function AboutPage() {
  const reduceMotion = useReducedMotion();
  const initial = reduceMotion ? "visible" : "hidden";
  const animate = "visible";

  return (
    <section className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <DustHaze />
      <div className="absolute inset-0 bg-linear-to-t from-background via-background/30 to-transparent" />

      {/* Fonts are guaranteed ready by the time this ever mounts — the app
          doesn't render at all until they are (ProfileGate + useFontsReady,
          gating sitewide, not just this page). */}
      <div className="relative z-10 mx-auto grid h-full min-h-0 w-full max-w-[1500px] grid-cols-[0.85fr_1.3fr] gap-12 px-14 py-9">
          <div className="flex min-h-0 flex-col items-start justify-center gap-10">
            <motion.p
              initial={initial}
              animate={animate}
              variants={essenceIn}
              className="max-w-2xl font-display text-lg leading-relaxed font-light text-color_text"
            >
              {ESSENCE_TEXT}
            </motion.p>

            <motion.div
              initial={initial}
              animate={animate}
              variants={contactIn}
              className="flex flex-col items-start gap-1"
            >
              <span className="font-mono text-[0.62rem] tracking-[0.2em] text-color_textsecondary uppercase">
                İletişim
              </span>
              <a
                href="mailto:mert.gurgenyatagi@gmail.com"
                className="w-fit font-display text-sm text-color_text no-underline transition-colors duration-150 ease-[var(--ease-cotton)] hover:text-color_accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-color_text"
              >
                mert.gurgenyatagi@gmail.com
              </a>
            </motion.div>
          </div>

          <div className="flex min-h-0 flex-col items-center justify-center gap-20">
            <motion.img
              initial={initial}
              animate={animate}
              variants={logoIn}
              src="/brand/kupatakip-logo-white.svg"
              alt="#kupatakipucl"
              className="h-[clamp(11rem,32vh,18rem)] w-auto"
            />
            <motion.div initial={initial} animate={animate} variants={timelineIn} className="w-full">
              <DateTimeline />
            </motion.div>
          </div>
        </div>
    </section>
  );
}

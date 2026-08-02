import { motion, useReducedMotion, type Variants } from "motion/react";
import { DustHaze } from "../home/DustHaze";
import { TOURNAMENT_START_ISO } from "../home/deadlines";
import { cn } from "@/lib/utils";

// Matches --ease-cotton (src/styles/index.css) / HomeLandingLoggedOut.tsx's
// own copy of the same curve, so every page's motion reads as one system.
const EASE_COTTON = [0.22, 0.61, 0.36, 1] as const;

// Essence, not rules and not a bio (explicitly cut during brainstorming) —
// what the project *is* in spirit. Line 1 is the signature word-by-word
// reveal (see wordVariants below); the rest reads as continuing prose.
const ESSENCE_LINE_1 =
  "Otuz altı takım. Tek bir sıralama. Ve bunu gereğinden fazla ciddiye alan bir avuç arkadaş.".split(" ");
const EMPHASIS_WORDS = new Set(["sıralama.", "ciddiye"]);

const PROSE_PARAGRAPHS = [
  "Kimse sadece eğlenmek için oynamıyor — grup sohbetinde aylarca süren tartışmalar var, unutulmayan tahminler var, her sezon yeniden açılan hesaplar var.",
  "Puan tablosu aslında bir sıralamadan fazlası: kimin hafızası daha güçlü, kimin cesareti daha fazla, kimin şansı daha yaver gidiyor — hepsinin sessiz kaydı.",
  "Turnuva bitince kupa kalkıyor, iddialar bitmiyor. Önümüzdeki sezon, aynı soru yeniden sorulacak.",
];

// Real, fixed UEFA-format dates (the project's own hard-dates record).
// TOURNAMENT_START_ISO is the only one with a live consumer elsewhere
// (src/home/deadlines.ts) — the other four have no other consumer yet,
// same situation that constant was in before it got its own file.
const KEY_DATES: { label: string; date: Date }[] = [
  { label: "Takımlar Belli Olur", date: new Date("2026-08-26T00:00:00+03:00") },
  { label: "Lig Aşaması Başlar", date: new Date(TOURNAMENT_START_ISO) },
  { label: "Lig Aşaması Biter", date: new Date("2027-01-27T00:00:00+03:00") },
  { label: "Son 16 Kurası", date: new Date("2027-02-26T00:00:00+03:00") },
  { label: "Son 16 Başlar", date: new Date("2027-03-09T00:00:00+03:00") },
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

const logoIn: Variants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE_COTTON } },
};

// The signature moment: line 1's words settle from a thin variable-font
// weight to their resting weight, staggered left-to-right — the statement
// reads as "found" rather than faded in. The prose paragraphs that follow
// continue the same stagger rhythm as plain block reveals (see
// essenceContainer's single staggerChildren covering both).
const wordVariants: Variants = {
  hidden: { opacity: 0, y: 6, fontWeight: 100 },
  visible: { opacity: 1, y: 0, fontWeight: 300, transition: { duration: 0.5, ease: EASE_COTTON } },
};
const wordVariantsEmphasis: Variants = {
  hidden: { opacity: 0, y: 6, fontWeight: 100 },
  visible: { opacity: 1, y: 0, fontWeight: 700, transition: { duration: 0.5, ease: EASE_COTTON } },
};
const proseIn: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_COTTON } },
};
const essenceContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.045, delayChildren: 0.35 } },
};
const timelineIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6, ease: EASE_COTTON, delay: 1.3 } },
};
const contactIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6, ease: EASE_COTTON, delay: 1.7 } },
};

function EssenceLine({ words }: { words: string[] }) {
  return (
    <p className="flex flex-wrap gap-x-[0.4em] gap-y-1">
      {words.map((word, i) => (
        <motion.span
          key={i}
          variants={EMPHASIS_WORDS.has(word) ? wordVariantsEmphasis : wordVariants}
          className={cn(EMPHASIS_WORDS.has(word) ? "text-color_accent" : "text-color_text")}
        >
          {word}
        </motion.span>
      ))}
    </p>
  );
}

// A stepper, not a decoration: the 5 dates are a genuine chronological
// sequence (signup close → league start → league end → RO16 draw → RO16
// start), so a connected-node timeline encodes something real about the
// content rather than just numbering it.
function DateTimeline() {
  return (
    <div className="relative flex w-full max-w-md items-start justify-between">
      <div aria-hidden className="absolute top-[6px] right-2 left-2 h-px bg-color_border1" />
      {KEY_DATES.map((item) => (
        <div key={item.label} className="relative z-10 flex flex-col items-center gap-3">
          <span className="size-3.5 shrink-0 rounded-full bg-color_gold" />
          <span className="tnum font-display text-base font-semibold text-color_text sm:text-lg">
            {formatChipDate(item.date)}
          </span>
          <span className="max-w-[5.5rem] text-center font-mono text-[0.6rem] leading-tight tracking-[0.12em] text-color_textsecondary uppercase">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * /about — static across every VisibilityState (no gating). Single
 * no-scroll viewport. Two-column poster composition (dense essence text +
 * contact info on the left, giant logo + a real-sequence date timeline on
 * the right) per Mert's own wireframe — deliberately not another Frame/
 * bento grid like every other page.
 */
export function AboutPage() {
  const reduceMotion = useReducedMotion();
  const initial = reduceMotion ? "visible" : "hidden";

  return (
    <section className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <DustHaze />
      <div className="absolute inset-0 bg-linear-to-t from-background via-background/30 to-transparent" />

      <div className="relative z-10 mx-auto grid h-full min-h-0 w-full max-w-[1400px] grid-cols-1 gap-10 px-6 py-6 sm:px-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16 lg:px-14 lg:py-9">
        <div className="flex min-h-0 flex-col justify-between gap-8">
          <motion.div
            initial={initial}
            animate="visible"
            variants={essenceContainer}
            className="flex flex-col gap-5 font-display text-xl leading-snug font-light text-balance sm:text-2xl"
          >
            <EssenceLine words={ESSENCE_LINE_1} />
            {PROSE_PARAGRAPHS.map((paragraph, i) => (
              <motion.p key={i} variants={proseIn} className="text-color_text">
                {paragraph}
              </motion.p>
            ))}
          </motion.div>

          <motion.div initial={initial} animate="visible" variants={contactIn} className="flex flex-col gap-1">
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
            animate="visible"
            variants={logoIn}
            src="/brand/kupatakip-logo-white.svg"
            alt="#kupatakipucl"
            className="h-[clamp(9rem,26vh,15rem)] w-auto"
          />
          <motion.div initial={initial} animate="visible" variants={timelineIn}>
            <DateTimeline />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

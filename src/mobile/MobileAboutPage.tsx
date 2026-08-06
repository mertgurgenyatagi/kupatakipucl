import { Fragment } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { DustHaze } from "../home/DustHaze";
import {
  CONTACT_EMAIL,
  ESSENCE_TEXT,
  KEY_DATES,
  currentThresholdFor,
  formatChipDate,
  getDateStatus,
} from "../pages/aboutContent";
import { cn } from "@/lib/utils";

const EASE_COTTON = [0.22, 0.61, 0.36, 1] as const;

const riseIn: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: EASE_COTTON } },
};

const staggerGroup: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

/**
 * /about on a phone: the mark, what this is, and when it happens.
 *
 * Desktop runs a two-column poster — text and contact on the left, a giant
 * logo over a horizontal timeline on the right. That composition is the one
 * thing on the site that was explicitly built desktop-only ("completely
 * disregard mobile from your thoughts"), so this is its first mobile pass
 * rather than an adaptation of anything.
 *
 * The timeline turns vertical, which is what the wireframe asks for
 * ("timeline, as vertical elements this time") and also the only orientation
 * that works: six labelled nodes across 390px would give each one 55px, and
 * the labels run to three words.
 *
 * The contact line is not in the wireframe. It is kept anyway — it is one
 * line of real content and the site's only way to reach anyone, which is a
 * different thing from the widgets the golden rule is aimed at. Easy to cut
 * if that reads as a misjudgement.
 */
export function MobileAboutPage() {
  const reduceMotion = useReducedMotion();
  const initial = reduceMotion ? "visible" : "hidden";

  return (
    <section className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <DustHaze />
      <div className="absolute inset-0 bg-linear-to-t from-background via-background/30 to-transparent" />

      <motion.div
        initial={initial}
        animate="visible"
        variants={staggerGroup}
        // Distributed rather than stacked with a fixed gap: this page has to land
        // inside one screenful now, and `justify-between` absorbs the difference
        // between a 667px phone and an 926px one without any of the four blocks
        // needing a breakpoint of its own.
        className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-between gap-4 px-6 py-5"
      >
        <motion.img
          variants={riseIn}
          src="/brand/kupatakip-logo-white.svg"
          alt="#kupatakipucl"
          className="h-[clamp(3.5rem,9vh,6rem)] w-auto shrink-0"
        />

        <motion.p
          variants={riseIn}
          className="min-h-0 overflow-y-auto font-display text-[0.78rem] leading-relaxed font-light text-color_textsecondary"
        >
          {ESSENCE_TEXT}
        </motion.p>

        <motion.div variants={riseIn} className="w-full">
          <VerticalDateTimeline />
        </motion.div>

        <motion.div variants={riseIn} className="flex flex-col items-center gap-1">
          <span className="font-mono text-[0.58rem] tracking-[0.2em] text-color_textsecondary uppercase">
            İletişim
          </span>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-display text-sm text-color_text no-underline"
          >
            {CONTACT_EMAIL}
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
}

/** The same stepper as desktop's, rotated: the rail runs down the left and
 *  each node's date and label sit beside it rather than beneath it. */
function VerticalDateTimeline() {
  const now = Date.now();
  const currentThreshold = currentThresholdFor(now);

  return (
    <ol className="flex flex-col">
      {KEY_DATES.map((item, i) => {
        const status = getDateStatus(item.date, now, currentThreshold);
        const isFuture = status === "future";
        const isCurrent = status === "current";
        return (
          <Fragment key={item.label}>
            <li className="flex items-center gap-3.5 py-0.5">
              <span
                className={cn(
                  "size-3.5 shrink-0 rounded-full",
                  isFuture ? "border-2 border-color_text bg-transparent" : "bg-color_text",
                  isCurrent && "animate-pulse"
                )}
              />
              <span
                className={cn(
                  "w-16 shrink-0 font-display text-base font-semibold tnum",
                  isFuture ? "text-color_textsecondary" : "text-color_text",
                  isCurrent && "animate-pulse"
                )}
              >
                {formatChipDate(item.date)}
              </span>
              <span
                className={cn(
                  "min-w-0 flex-1 font-mono text-[0.58rem] leading-tight tracking-[0.1em] uppercase",
                  isFuture ? "text-color_textsecondary/70" : "text-color_textsecondary",
                  isCurrent && "animate-pulse"
                )}
              >
                {item.label}
              </span>
            </li>
            {/* The rail segment, inset to sit under the node's centre. */}
            {i < KEY_DATES.length - 1 && (
              <span aria-hidden className="ml-[0.4rem] h-[clamp(0.5rem,1.4vh,1rem)] w-px shrink-0 bg-color_border1" />
            )}
          </Fragment>
        );
      })}
    </ol>
  );
}

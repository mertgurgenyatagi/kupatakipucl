import { motion, useReducedMotion } from "motion/react";

interface Blob {
  top: string;
  left: string;
  vmax: number;
  color: string;
  duration: number;
  delay: number;
}

// Two blues distinct from the site's own (no-longer-blue) --navy token,
// plus near-black — deliberately scoped to this one component, not
// promoted to global tokens (this section is meant to be its own weird
// moment, not a repaint of the site's palette).
const DEEP = "#0d1730";
const MID = "#1c2f66";
const BRIGHT = "#2f56b8";

const BLOBS: Blob[] = [
  { top: "8%", left: "6%", vmax: 46, color: MID, duration: 16, delay: 0 },
  { top: "52%", left: "64%", vmax: 56, color: BRIGHT, duration: 20, delay: 1 },
  { top: "66%", left: "10%", vmax: 40, color: DEEP, duration: 15, delay: 3 },
  { top: "12%", left: "70%", vmax: 34, color: DEEP, duration: 18, delay: 2 },
  { top: "36%", left: "38%", vmax: 50, color: MID, duration: 21, delay: 4 },
];

// A faint fractal-noise grain, laid over the blur at low opacity — the
// "high definition" half of the brief: without it, a stack of blurred
// circles reads as a cheap low-res gradient rather than something crisp.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/**
 * Hero background — replaces the photo carousel here specifically (the
 * carousel's three images move down into the sections below instead, see
 * SplitBand). Mert's brief, verbatim: "an animating blurred haze of
 * enlargened dust particles in a dance of pitch black and blue, moving with
 * elegance and embodying high definition."
 *
 * A handful of large, heavily-blurred fields drifting slowly and
 * independently — not a literal particle simulation (canvas/WebGL), which
 * would read as the Awwwards-style spectacle DESIGN-SPEC §9 rules out.
 * "Elegance" comes from slow, mirrored, staggered motion rather than speed
 * or density.
 */
export function DustHaze() {
  const reduceMotion = useReducedMotion();

  return (
    <div
      aria-hidden
      className="absolute inset-0 overflow-hidden bg-background"
      // Own compositing layer, isolated and clipped every frame — without
      // this, Chrome can desync the blurred layer's paint from its clip
      // during scroll, letting a blob's raw color flash past the edge
      // (the "curtain lifting" glitch). Standard fix for blur+overflow-
      // hidden content inside a scrolling ancestor.
      style={{ transform: "translateZ(0)", contain: "paint" }}
    >
      {BLOBS.map((blob, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            top: blob.top,
            left: blob.left,
            width: `${blob.vmax}vmax`,
            height: `${blob.vmax}vmax`,
            background: blob.color,
            filter: "blur(70px)",
            opacity: 0.6,
          }}
          animate={
            reduceMotion
              ? undefined
              : {
                  x: ["0%", "14%", "-10%", "0%"],
                  y: ["0%", "-12%", "10%", "0%"],
                  scale: [1, 1.18, 0.88, 1],
                }
          }
          transition={{
            duration: blob.duration,
            delay: blob.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
        style={{ backgroundImage: GRAIN }}
      />
    </div>
  );
}

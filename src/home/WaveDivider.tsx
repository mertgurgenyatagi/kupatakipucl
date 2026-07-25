import { cn } from "@/lib/utils";

interface WaveDividerProps {
  /** CSS color the wave itself is filled with — reads as the leading edge
   *  of the band that follows it (PAGE_BRIEFING.txt: "curvy boundaries,
   *  closing areas colored our existing dark blue or our white"). */
  fill: string;
  flip?: boolean;
  className?: string;
}

/** A single smooth arc, not a busy multi-wave squiggle — matches the site's
 *  precise/restrained register (DESIGN-SPEC §9's anti-Awwwards-spectacle
 *  rule) rather than a playful SaaS-marketing wave stack. */
export function WaveDivider({ fill, flip, className }: WaveDividerProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1440 96"
      preserveAspectRatio="none"
      className={cn("block h-12 w-full text-transparent sm:h-20", flip && "-scale-y-100", className)}
    >
      <path d="M0,32 C 280,88 480,0 720,28 C 960,56 1180,4 1440,36 L1440,96 L0,96 Z" fill={fill} />
    </svg>
  );
}

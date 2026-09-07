import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * The small red "breathing" dot marking anything live — a fixture row, a
 * matchup popup, the nav badge. One shared component so the pulse timing
 * and reduced-motion handling can't drift between the three places it
 * shows up. `prefers-reduced-motion` gets a solid dot instead of an
 * animated one, same convention as the rest of the app's `motion` usage
 * (HomeLandingLoggedOut.tsx and others already check useReducedMotion).
 */
export function LiveDot({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.span
      aria-hidden
      className={cn("block rounded-full bg-color_remove", className)}
      animate={reduceMotion ? { opacity: 1 } : { opacity: [1, 0.3, 1] }}
      transition={reduceMotion ? undefined : { duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

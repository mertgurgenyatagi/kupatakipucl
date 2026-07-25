import { useEffect, useState } from "react";

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
}

function partsUntil(targetMs: number, nowMs: number): CountdownParts {
  const diff = Math.max(0, targetMs - nowMs);
  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    done: diff <= 0,
  };
}

/** Ticks once a second toward `targetIso`, clamped at zero once it passes —
 *  SPEC.md §8a's "if it gets tricky, drop it for a plain static date rather
 *  than over-investing" fallback isn't needed here: a setInterval tick is
 *  about as simple as this gets. */
export function useCountdown(targetIso: string): CountdownParts {
  const targetMs = new Date(targetIso).getTime();
  const [parts, setParts] = useState(() => partsUntil(targetMs, Date.now()));

  useEffect(() => {
    setParts(partsUntil(targetMs, Date.now()));
    const id = setInterval(() => setParts(partsUntil(targetMs, Date.now())), 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  return parts;
}

import { useEffect, useState } from "react";

/**
 * True once `loading` has stayed true for longer than `delayMs` — never on
 * the ordinary path where data arrives quickly.
 *
 * Exists for exactly one failure class: a real-time Firestore listener
 * (`onSnapshot`) whose long-polling channel gets silently dropped by a
 * browser extension. Chrome reports that as `net::ERR_BLOCKED_BY_CLIENT`
 * before the request ever reaches Firestore, so it never surfaces as a
 * catchable error the way a rules denial does — the hook it's feeding just
 * sits in `loading: true` forever, and the page it gates stays blank
 * indefinitely (2026-08-28, reported live: Home and Forum both hung this way
 * for a participant, traced to an ad blocker).
 *
 * Deliberately not a retry or a fallback fetch — see PROJECT.md §11 for why
 * that was the fuller fix and wasn't taken. This is the "tell them something
 * rather than nothing" version: a page stuck past `delayMs` shows a notice
 * instead of an unexplained blank screen.
 */
export function useLoadingStuck(loading: boolean, delayMs = 7000): boolean {
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    if (!loading) {
      setStuck(false);
      return;
    }
    const timer = setTimeout(() => setStuck(true), delayMs);
    return () => clearTimeout(timer);
  }, [loading, delayMs]);

  return stuck;
}

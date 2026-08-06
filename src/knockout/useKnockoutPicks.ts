import { useState } from "react";
import { KnockoutPrediction } from "./knockoutTypes";

/**
 * The bracket's pick state machine, independent of how the bracket is drawn.
 *
 * Extracted when the mobile bracket arrived. The two layouts are genuinely
 * different — desktop mirrors two halves inward toward a centre final, mobile
 * runs one-sided left-to-right so it can scroll horizontally — but the rules
 * underneath are identical, and this codebase already carries one hand-
 * duplicated algorithm kept in sync by a comment (`scoring.ts` versus
 * `functions/leaderboard/index.js`, PROJECT_STATE §11). One is enough.
 *
 * The rule that makes this more than four `useState`s: **picking a team into
 * a round has to evict it from every round after.** Deselect a
 * quarter-finalist who you'd also made champion and the trophy has to empty
 * itself, or the bracket claims a final between a team that isn't in it.
 */
export interface KnockoutPicks {
  r16Picks: (string | null)[];
  qfPicks: (string | null)[];
  sfPicks: (string | null)[];
  championPick: string | null;
  pickR16: (index: number, teamId: string) => void;
  pickQf: (index: number, teamId: string) => void;
  pickSf: (index: number, teamId: string) => void;
  pickChampion: (teamId: string) => void;
  reset: () => void;
  isComplete: boolean;
  /** The prediction payload, or null when the bracket isn't finished. */
  toPrediction: () => Omit<KnockoutPrediction, "submittedAt" | "updatedAt"> | null;
}

export function useKnockoutPicks(
  initialPrediction?: KnockoutPrediction | null
): KnockoutPicks {
  const [r16Picks, setR16Picks] = useState<(string | null)[]>(
    () => initialPrediction?.quarterFinalists ?? Array(8).fill(null)
  );
  const [qfPicks, setQfPicks] = useState<(string | null)[]>(
    () => initialPrediction?.semiFinalists ?? Array(4).fill(null)
  );
  const [sfPicks, setSfPicks] = useState<(string | null)[]>(
    () => initialPrediction?.finalists ?? Array(2).fill(null)
  );
  const [championPick, setChampionPick] = useState<string | null>(
    () => initialPrediction?.champion ?? null
  );

  function clearDownstream(teamId: string) {
    setQfPicks((prev) => prev.map((id) => (id === teamId ? null : id)));
    setSfPicks((prev) => prev.map((id) => (id === teamId ? null : id)));
    setChampionPick((prev) => (prev === teamId ? null : prev));
  }

  function pickR16(i: number, teamId: string) {
    const cur = r16Picks[i];
    if (cur === teamId) {
      const next = [...r16Picks];
      next[i] = null;
      setR16Picks(next);
      clearDownstream(teamId);
    } else {
      if (cur) clearDownstream(cur);
      const next = [...r16Picks];
      next[i] = teamId;
      setR16Picks(next);
    }
  }

  function pickQf(i: number, teamId: string) {
    const cur = qfPicks[i];
    if (cur === teamId) {
      const next = [...qfPicks];
      next[i] = null;
      setQfPicks(next);
      setSfPicks((prev) => prev.map((id) => (id === teamId ? null : id)));
      if (championPick === teamId) setChampionPick(null);
    } else {
      if (cur) {
        setSfPicks((prev) => prev.map((id) => (id === cur ? null : id)));
        if (championPick === cur) setChampionPick(null);
      }
      const next = [...qfPicks];
      next[i] = teamId;
      setQfPicks(next);
    }
  }

  function pickSf(i: number, teamId: string) {
    const cur = sfPicks[i];
    if (cur === teamId) {
      const next = [...sfPicks];
      next[i] = null;
      setSfPicks(next);
      if (championPick === teamId) setChampionPick(null);
    } else {
      if (cur && championPick === cur) setChampionPick(null);
      const next = [...sfPicks];
      next[i] = teamId;
      setSfPicks(next);
    }
  }

  function pickChampion(teamId: string) {
    setChampionPick((prev) => (prev === teamId ? null : teamId));
  }

  function reset() {
    setR16Picks(Array(8).fill(null));
    setQfPicks(Array(4).fill(null));
    setSfPicks(Array(2).fill(null));
    setChampionPick(null);
  }

  const isComplete =
    r16Picks.every(Boolean) &&
    qfPicks.every(Boolean) &&
    sfPicks.every(Boolean) &&
    Boolean(championPick);

  function toPrediction() {
    if (!isComplete || !championPick) return null;
    return {
      quarterFinalists: r16Picks.filter((x): x is string => Boolean(x)),
      semiFinalists: qfPicks.filter((x): x is string => Boolean(x)),
      finalists: sfPicks.filter((x): x is string => Boolean(x)),
      champion: championPick,
    };
  }

  return {
    r16Picks,
    qfPicks,
    sfPicks,
    championPick,
    pickR16,
    pickQf,
    pickSf,
    pickChampion,
    reset,
    isComplete,
    toPrediction,
  };
}

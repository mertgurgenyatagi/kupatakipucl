/**
 * The whole prediction ranker, as a state machine.
 *
 * Two clicks do everything: pick a team up, then click where it goes. Holding
 * is *selection only* — nothing in the ranking moves until the second click,
 * so there is never a half-applied state to reason about.
 *
 * Deliberately free of React and the DOM: every transition below is directly
 * unit-testable, which the previous drag-and-drop version never was (jsdom
 * cannot simulate a pointer drag).
 */

/** Where a held team was picked up from: the pool, or the rank it occupies. */
export type HeldOrigin = "pool" | number;

export interface Held {
  teamId: string;
  origin: HeldOrigin;
}

export interface RankerState {
  /** `ranking[i]` is the team id at rank `i + 1`, or `null` if that rank is empty. */
  ranking: (string | null)[];
  held: Held | null;
}

export type RankerAction =
  | { type: "clickPoolTeam"; teamId: string }
  | { type: "clickSlot"; index: number }
  | { type: "clickPoolBackground" }
  | { type: "cancel" }
  | { type: "reset" };

export function createRankerState(slotCount: number, initialOrder?: string[]): RankerState {
  const ranking =
    initialOrder && initialOrder.length === slotCount
      ? [...initialOrder]
      : Array<string | null>(slotCount).fill(null);
  return { ranking, held: null };
}

export function rankerReducer(state: RankerState, action: RankerAction): RankerState {
  const { ranking, held } = state;

  switch (action.type) {
    case "clickPoolTeam": {
      if (!held) {
        return { ranking, held: { teamId: action.teamId, origin: "pool" } };
      }
      if (held.teamId === action.teamId) {
        return { ranking, held: null };
      }
      if (held.origin === "pool") {
        // Just move the selection to the team that was clicked.
        return { ranking, held: { teamId: action.teamId, origin: "pool" } };
      }
      // Held a ranked team: the pool team takes its rank, and the held team
      // returns to the pool by no longer appearing in `ranking`.
      const next = [...ranking];
      next[held.origin] = action.teamId;
      return { ranking: next, held: null };
    }

    case "clickSlot": {
      const { index } = action;

      if (!held) {
        const teamId = ranking[index];
        // Clicking an empty rank with nothing in hand does nothing.
        return teamId === null ? state : { ranking, held: { teamId, origin: index } };
      }

      if (held.origin === index) {
        // Clicked the rank it came from — put it back, unchanged.
        return { ranking, held: null };
      }

      const next = [...ranking];
      const displaced = next[index];
      next[index] = held.teamId;
      if (held.origin !== "pool") {
        // Swap: whoever was here takes the rank we just vacated. When the
        // target was empty, `displaced` is null and the old rank empties.
        next[held.origin] = displaced;
      }
      // Held from the pool: `displaced` simply stops appearing in `ranking`,
      // which is exactly what returns it to the pool.
      return { ranking: next, held: null };
    }

    case "clickPoolBackground": {
      if (!held) return state;
      if (held.origin === "pool") return { ranking, held: null };
      const next = [...ranking];
      next[held.origin] = null;
      return { ranking: next, held: null };
    }

    case "cancel":
      return held ? { ranking, held: null } : state;

    case "reset":
      return { ranking: Array<string | null>(ranking.length).fill(null), held: null };
  }
}

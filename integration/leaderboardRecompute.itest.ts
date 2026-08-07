import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

// `firebase emulators:exec` sets FIRESTORE_EMULATOR_HOST for us, which is what
// makes initializeApp() work with no credentials at all.
//
// Synthetic team ids rather than the real 36 from src/predictions/teams.ts:
// the function only ever looks a ranking's ids up in `results`, so as long as
// both sides agree the scores compute identically, and the test stays
// self-contained.
const TEAM_IDS = Array.from({ length: 36 }, (_, i) => `team-${i + 1}`);

const CONTROL = "leaderboardCache/control";
const CACHE = "leaderboardCache/current";

let app: ReturnType<typeof initializeApp>;
let db: Firestore;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function computeCount(): Promise<number> {
  const snap = await db.doc(CONTROL).get();
  return (snap.data()?.computeCount as number | undefined) ?? 0;
}

/**
 * Waits until the recompute count has risen above `baseline` and then stopped
 * moving, and returns how many recomputes happened.
 *
 * Both halves of that condition are load-bearing, and getting it wrong is how
 * the first two drafts of this file produced meaningless results:
 *
 * - Polling for mere *stability* returns immediately while every trigger is
 *   still asleep in its 2s debounce, reporting "0 recomputes, settled" for work
 *   that had not started. Requiring `> baseline` is what fixes that.
 * - A fixed sleep is worse still. The functions emulator serializes invocations
 *   far harder than Cloud Run (containerConcurrency 80) and each invocation
 *   holds its slot for the full debounce, so 36 triggers drain over ~25s. Any
 *   sleep short enough to keep the suite usable reads a half-finished value.
 *
 * `stableMs` must comfortably exceed the debounce plus one recompute.
 */
async function recomputesSince(
  baseline: number,
  stableMs = 8000,
  maxWaitMs = 120000
): Promise<number> {
  const start = Date.now();
  let last = baseline;
  let stableSince = 0;

  while (Date.now() - start < maxWaitMs) {
    const count = await computeCount();
    if (count !== last) {
      last = count;
      stableSince = Date.now();
    } else if (count > baseline && stableSince > 0 && Date.now() - stableSince >= stableMs) {
      return count - baseline;
    }
    await wait(500);
  }
  throw new Error(
    `Timed out after ${maxWaitMs}ms waiting for a recompute past baseline ${baseline} (saw ${last})`
  );
}

async function wipe(): Promise<void> {
  for (const name of ["predictions", "profiles", "results", "leaderboardCache"]) {
    const snap = await db.collection(name).get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
  }
}

/** Seeds profiles + predictions under a per-test uid prefix.
 *
 *  Each test owns its own namespace so nothing ever has to be deleted between
 *  tests. That matters more than it looks: a delete is itself a
 *  `predictions/{uid}` write, so wiping between tests fired its own trigger
 *  storm whose in-flight recomputes then landed inside the next test's
 *  measurement window. */
async function seedParticipants(prefix: string, count: number): Promise<void> {
  await Promise.all(
    Array.from({ length: count }, (_, i) =>
      db.doc(`profiles/${prefix}${i}`).set({ firstName: `P${i}`, lastName: "Test", photoURL: "" })
    )
  );
  await Promise.all(
    Array.from({ length: count }, (_, i) =>
      db.doc(`predictions/${prefix}${i}`).set({ ranking: TEAM_IDS, submittedAt: Date.now() + i })
    )
  );
}

describe("leaderboard recompute under load", () => {
  beforeAll(async () => {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
      throw new Error("Run via `npm run test:integration` — no emulator detected.");
    }
    app = initializeApp({ projectId: "kupatakipucl" });
    db = getFirestore(app);

    // One wipe for the whole file, then let the triggers that wipe itself fires
    // drain completely before any test takes a baseline.
    await wipe();
    await wait(6000);
    let last = -1;
    for (let i = 0; i < 120; i++) {
      const count = await computeCount();
      if (count === last) break;
      last = count;
      await wait(2000);
    }
    await wipe();
    await wait(8000);
  }, 180000);

  afterAll(async () => {
    await deleteApp(app);
  });

  // The realistic storm: src/devpanel/useDevMatches.ts commits all 36 results
  // docs for a single match outcome, and every doc whose value actually changed
  // fires its own trigger. Before the debounce each of those ran its own full
  // recompute over every prediction and profile.
  //
  // Bounded rather than exact, deliberately. The emulator's concurrency is
  // roughly 12-way, so 36 triggers arrive spread across several debounce
  // windows instead of one, and whether any given pair overlaps is a timing
  // accident of the emulator rather than a property of this design. Asserting
  // an exact 1 here would be asserting the emulator's scheduler.
  //
  // The exact mechanism is covered deterministically instead by
  // functions/leaderboard/recomputeGuard.test.js (shouldProceedAfterDebounce
  // stands down for a newer token), and the true production number is measured
  // in the plan's Task 8.
  it("collapses a 36-document results batch into far fewer recomputes than changed documents", async () => {
    const seedBaseline = await computeCount();
    await seedParticipants("storm", 3);
    await recomputesSince(seedBaseline);

    const baseline = await computeCount();
    const batch = db.batch();
    TEAM_IDS.forEach((teamId, i) => {
      batch.set(db.doc(`results/${teamId}`), {
        position: i + 1,
        points: 36 - i,
        goalDifference: 0,
        matchesPlayed: 1,
      });
    });
    await batch.commit();

    const recomputes = await recomputesSince(baseline);
    // Reported rather than silently asserted, because the exact figure is the
    // interesting output of this test and it varies with the runner.
    //
    // Emulator: 6, down from 36 before the coalescing guards. It is not 1 there
    // for a reason worth knowing — the emulator appears to stamp `event.time`
    // per delivery rather than per commit, and it delivers the 36 triggers
    // sequentially over ~25s, so a late trigger's event time is *after* the
    // earlier recompute's read and it cannot recognise itself as covered.
    // Production Eventarc stamps the real commit time, which is identical for
    // every document in one batch, so all but the first should skip. Task 8
    // measures that; 6 is the pessimistic floor, not the expected figure.
    console.log(`[storm] 36 changed result docs -> ${recomputes} recompute(s)`);
    // 36 changed documents must not produce anything close to 36 recomputes,
    // which is exactly what happened before the coalescing guards.
    expect(recomputes).toBeLessThan(10);
  });

  // The lost-update race, asserted as its observable guarantee: with no
  // concurrency control two overlapping recomputes could interleave so the
  // older read landed last, silently erasing a just-submitted prediction with
  // nothing scheduled to re-trigger.
  it("never drops a prediction when many are submitted at once", async () => {
    const N = 25;
    const baseline = await computeCount();
    await seedParticipants("race", N);
    await recomputesSince(baseline);

    const cache = (await db.doc(CACHE).get()).data();
    const entries = (cache?.entries ?? []) as { uid: string }[];
    const mine = new Set(entries.filter((e) => e.uid.startsWith("race")).map((e) => e.uid));

    expect(mine.size).toBe(N);
  });
});

# Scaling to 250 Participants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every request path safe at 250 registered participants / 40–50 concurrent, by removing the leaderboard recompute storm and its lost-update race, capping the only time-unbounded query in the app, and caching the three uncached headcount-sized fetches.

**Architecture:** The leaderboard Cloud Function stops recomputing per changed document. Both triggers now stamp a token into a control doc, sleep through a debounce window, and only the last one standing recomputes — collapsing a 36-document `results` batch into one recompute. The commit is transactional and guarded on read freshness, which makes stored results **monotonic**: an older read can never overwrite a newer one under any interleaving. A scheduled pass makes a dropped trigger self-healing. On the client, `searchMessages` gains a window cap, and three hooks get wired into the existing `sessionCache`.

**Tech Stack:** Firebase Cloud Functions v2 (`firebase-functions` ^5.1.0, Node 20, plain CommonJS JS), Firestore (Native, `europe-west8`, `PESSIMISTIC` concurrency), React 18 + TypeScript, Vitest + @testing-library/react, Firebase Emulator Suite (`firebase-tools` 15.24.0, already installed).

**Spec:** `docs/superpowers/specs/2026-08-07-scaling-250-users-design.md`

## Global Constraints

- `DEBOUNCE_MS = 2000` — how long a recompute request waits before deciding it is the newest.
- `MAX_STALENESS_MS = 30000` — staleness ceiling; past this a request recomputes even if not newest.
- Scheduled safety net interval: **every 5 minutes**.
- `SEARCH_WINDOW = 2000` — chat search's message-window cap.
- Control document path: **`leaderboardCache/control`**. Deliberately inside the existing collection so **no `firestore.rules` change is required** — `leaderboardCache/{docId}` is already `read: true, write: false`, and the Admin SDK bypasses rules.
- Cache document path: `leaderboardCache/current` (unchanged, and its **stored shape is unchanged** — no client-side migration in this plan).
- **The scheduled function MUST be pinned to `region: "europe-west8"`.** Firestore triggers infer their region from the Firestore database location; `onSchedule` does **not**, and would silently land in `us-central1`.
- `functions/` is **not** in `tsconfig.json`'s `include` (`["src", "test"]`), so function code is plain JS and is never type-checked by `tsc -b`.
- Integration tests use the filename suffix **`.itest.ts`**, which vitest's default `include` (`*.test.*` / `*.spec.*`) does **not** match — so they never run in `npm test` and `vite.config.ts` needs no change.
- Turkish is the app's UI language. All user-facing copy is Turkish.
- At every checkpoint: `tsc -b` clean, `npx vite build` clean, and the full suite green — **baseline 960 tests / 126 files**, measured by actually running `npm test` on `scaling-250-users` at 1f43ec6 on 2026-08-07. (`HANDOVER.md` says 956/126; that predates the ParticipantPopup knockout-tab commit, which added 4. Trust this number, not that one.) Test counts only go up.

---

## File Structure

**Create:**
- `functions/leaderboard/recomputeGuard.js` — the two pure concurrency-control predicates plus their timing constants. No Firebase imports, no I/O; exists to be exhaustively unit-testable.
- `functions/leaderboard/recomputeGuard.test.js` — unit tests for the above, running in the normal suite.
- `integration/leaderboardRecompute.itest.ts` — emulator-driven tests for the storm and the submission stress case.
- `vitest.integration.config.ts` — node-environment vitest config for `*.itest.ts`.
- `src/knockout/useAllKnockoutPredictions.test.ts` — first test file for a hook that currently has none.

**Modify:**
- `functions/leaderboard/index.js` — debounce, guarded transactional commit, projection, scheduled safety net.
- `firebase.json` — add an `emulators` block.
- `package.json` — add `test:integration` script and a root `firebase-admin` devDependency.
- `src/chat/searchMessages.ts:26-31` — window cap and rename.
- `src/chat/searchMessages.test.ts` — mock `limit`, follow the rename.
- `src/chat/ChatRoom.tsx:8,283-309,375-377` — follow the rename, track window saturation, extend the empty state.
- `src/chat/ChatRoom.test.tsx:14-20` — follow the rename in the mock.
- `src/predictions/usePredictionSubmitters.ts`, `src/predictions/useSurveyResponses.ts`, `src/knockout/useAllKnockoutPredictions.ts` — wire into `sessionCache`.
- `src/predictions/usePredictionSubmitters.test.ts`, `src/predictions/useSurveyResponses.test.ts` — add `clearSessionCache()` and cache-behaviour tests.

---

### Task 1: The pure concurrency-control predicates

This task exists because the interleaving that guard (b) protects against is the hardest thing in this design to provoke on demand against a real or emulated Firestore. Extracting it as a pure function lets it be tested **exhaustively instead of hopefully** — the same reasoning that pulled `selectNearbyWindow` out of `NearbyStandingsList` on 2026-08-03.

**Files:**
- Create: `functions/leaderboard/recomputeGuard.js`
- Test: `functions/leaderboard/recomputeGuard.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `DEBOUNCE_MS: number` (2000)
  - `MAX_STALENESS_MS: number` (30000)
  - `shouldProceedAfterDebounce(control: object | null, myToken: string, now: number): boolean`
  - `shouldCommitRecompute(control: object | null, readStartedAt: number): boolean`
  - `control` is the `leaderboardCache/control` document data, or `null` when it does not exist. Its fields: `requestToken: string`, `requestedAt: number`, `computedAt: number`, `computedThroughRequestedAt: number`, `lastComputeReadStartedAt: number`, `computeCount: number`. Every numeric field must be treated as `0` when absent.

- [ ] **Step 1: Write the failing test**

Create `functions/leaderboard/recomputeGuard.test.js`:

```js
import { describe, it, expect } from "vitest";
import {
  DEBOUNCE_MS,
  MAX_STALENESS_MS,
  shouldProceedAfterDebounce,
  shouldCommitRecompute,
} from "./recomputeGuard.js";

describe("recomputeGuard constants", () => {
  it("uses the debounce and ceiling values the design specifies", () => {
    expect(DEBOUNCE_MS).toBe(2000);
    expect(MAX_STALENESS_MS).toBe(30000);
  });
});

describe("shouldProceedAfterDebounce", () => {
  it("proceeds when no control doc exists yet", () => {
    expect(shouldProceedAfterDebounce(null, "me", 1000)).toBe(true);
  });

  it("proceeds when this invocation still holds the newest token", () => {
    const control = { requestToken: "me", requestedAt: 500, computedAt: 400 };
    expect(shouldProceedAfterDebounce(control, "me", 2500)).toBe(true);
  });

  // This is the step that collapses a 36-doc results batch into one recompute.
  it("stands down when a newer request has taken the token", () => {
    const control = { requestToken: "someone-newer", requestedAt: 900, computedAt: 800 };
    expect(shouldProceedAfterDebounce(control, "me", 2500)).toBe(false);
  });

  // Without this, a sustained write stream means no request is ever the newest
  // at its own wake-up, so the leaderboard would stop updating entirely for as
  // long as the load lasted.
  it("proceeds despite a newer token once the stored result breaches the staleness ceiling", () => {
    const control = { requestToken: "someone-newer", requestedAt: 900, computedAt: 1000 };
    expect(shouldProceedAfterDebounce(control, "me", 1000 + MAX_STALENESS_MS)).toBe(true);
  });

  it("treats a never-computed leaderboard as maximally stale and proceeds", () => {
    const control = { requestToken: "someone-newer", requestedAt: 900 };
    expect(shouldProceedAfterDebounce(control, "me", 2500)).toBe(true);
  });
});

describe("shouldCommitRecompute", () => {
  it("commits when no control doc exists yet", () => {
    expect(shouldCommitRecompute(null, 5000)).toBe(true);
  });

  it("commits when nothing moved under this read", () => {
    const control = { requestedAt: 4000, lastComputeReadStartedAt: 3000 };
    expect(shouldCommitRecompute(control, 5000)).toBe(true);
  });

  // Guard (a): a newer request landed after this read began, so it will produce
  // a fresher result -- let it win rather than storing known-stale data.
  it("aborts when inputs changed after this read began", () => {
    const control = { requestedAt: 6000, lastComputeReadStartedAt: 3000 };
    expect(shouldCommitRecompute(control, 5000)).toBe(false);
  });

  // Guard (b) -- the load-bearing property. The staleness ceiling deliberately
  // allows concurrent recomputes, so without this an older read could land last
  // and silently erase a newer one: exactly the lost-update race this whole
  // design exists to remove.
  it("aborts when a compute from a fresher read has already landed", () => {
    const control = { requestedAt: 4000, lastComputeReadStartedAt: 7000 };
    expect(shouldCommitRecompute(control, 5000)).toBe(false);
  });

  it("commits when the stored compute came from this very same read", () => {
    const control = { requestedAt: 4000, lastComputeReadStartedAt: 5000 };
    expect(shouldCommitRecompute(control, 5000)).toBe(true);
  });

  it("treats absent numeric fields as zero rather than NaN-comparing them", () => {
    expect(shouldCommitRecompute({}, 5000)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run functions/leaderboard/recomputeGuard.test.js`
Expected: FAIL — cannot resolve `./recomputeGuard.js`.

If instead it fails because vitest does not pick the file up at all, the cause is the `include` glob; confirm the filename is exactly `recomputeGuard.test.js`. If it fails on CommonJS/ESM interop of the named imports, change the import to `import guard from "./recomputeGuard.js";` plus destructuring — the module stays CommonJS either way because `index.js` must `require()` it.

- [ ] **Step 3: Write the implementation**

Create `functions/leaderboard/recomputeGuard.js`:

```js
// Pure decision logic for the leaderboard recompute's concurrency control,
// kept out of index.js so it can be unit-tested exhaustively in the normal
// suite (scaling-250 design spec, 2026-08-07, S2). The interleavings these two
// predicates guard against are the hardest thing in that design to provoke on
// demand against a real or emulated Firestore, so testing the decision rather
// than the timing is the only honest coverage available -- same reasoning as
// selectNearbyWindow (2026-08-03).
//
// CommonJS on purpose: index.js is plain JS run by Cloud Functions, and
// functions/ is outside tsconfig.json's include.

/** How long a recompute request waits before deciding whether it is newest. */
const DEBOUNCE_MS = 2000;

/** Past this age, a request recomputes even without holding the newest token. */
const MAX_STALENESS_MS = 30000;

const num = (value) => (typeof value === "number" ? value : 0);

/**
 * After sleeping DEBOUNCE_MS, should this invocation actually do the recompute?
 *
 * Normally only the newest request proceeds — that is what turns a 36-document
 * `results` batch into a single recompute instead of 5-15 concurrent ones.
 *
 * The ceiling is the deliberate exception. Under a *sustained* write stream no
 * request ever becomes the newest at its own wake-up, so a pure "newest wins"
 * rule would starve and the leaderboard would stop updating for the duration of
 * the load. Breaching the ceiling trades mutual exclusion for bounded
 * staleness — which is only safe because shouldCommitRecompute below keeps
 * stored results monotonic regardless.
 */
function shouldProceedAfterDebounce(control, myToken, now) {
  if (!control) return true;
  if (control.requestToken === myToken) return true;
  return now - num(control.computedAt) >= MAX_STALENESS_MS;
}

/**
 * Having computed a result from a read that began at `readStartedAt`, is it safe
 * to store it?
 *
 * Guard (a) — inputs changed after this read began, so a newer request is
 *   already in flight with fresher data. Abort instead of storing known-stale
 *   data; by induction the newest request always completes.
 *
 * Guard (b) — a compute based on a *fresher* read has already landed, so this
 *   one is stale by definition. This is the load-bearing correctness property
 *   of the whole design: it makes stored results monotonic in read freshness
 *   under any interleaving, including the ceiling path above. Guard (a) alone
 *   is only sufficient while the debounce provides mutual exclusion, and the
 *   ceiling exists precisely to break that.
 */
function shouldCommitRecompute(control, readStartedAt) {
  if (!control) return true;
  if (num(control.requestedAt) > readStartedAt) return false;
  if (num(control.lastComputeReadStartedAt) > readStartedAt) return false;
  return true;
}

module.exports = {
  DEBOUNCE_MS,
  MAX_STALENESS_MS,
  shouldProceedAfterDebounce,
  shouldCommitRecompute,
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run functions/leaderboard/recomputeGuard.test.js`
Expected: PASS, 11 tests.

- [ ] **Step 5: Run the full suite to confirm nothing regressed**

Run: `npm test`
Expected: PASS. Total is now **971 tests / 127 files** (960/126 baseline + 11 tests in 1 new file). If the new file is *not* in the count, vitest is not picking it up — resolve that now rather than later, since Task 4's assertions depend on this module being real.

- [ ] **Step 6: Commit**

```bash
git add functions/leaderboard/recomputeGuard.js functions/leaderboard/recomputeGuard.test.js
git commit -m "feat: pure concurrency-control predicates for the leaderboard recompute"
```

---

### Task 2: Debounce the triggers and guard the commit

**Files:**
- Modify: `functions/leaderboard/index.js` (whole-file rewrite; currently 78 lines)

**Interfaces:**
- Consumes: `DEBOUNCE_MS`, `shouldProceedAfterDebounce`, `shouldCommitRecompute` from Task 1.
- Produces: `exports.recomputeLeaderboardOnPrediction`, `exports.recomputeLeaderboardOnResult` (both unchanged in name, so the deploy replaces rather than duplicates). `runRecompute()`, `computeEntries()`, `CONTROL_DOC` and `CACHE_DOC` stay module-private — Task 3 is in the same file and reaches them through module scope, never through `exports`.
- Control doc fields written: `requestToken`, `requestedAt`, `computedAt`, `computedThroughRequestedAt`, `lastComputeReadStartedAt`, `computeCount`.

`computeCount` is incremented on every successful commit. It exists so Task 4 can assert "exactly one recompute happened" as a plain number instead of trying to count invocations, and it doubles as production observability.

- [ ] **Step 1: Rewrite `functions/leaderboard/index.js`**

There is no unit test in this step. The decision logic is already covered by Task 1, and the orchestration around it — trigger fan-in, sleeping, transactions — is exactly what jsdom cannot observe and what Task 4's emulator tests exist for. Do not fabricate a mock-Firestore unit test here; it would assert the shape of the mock, which is the failure mode `HANDOVER.md` has now logged four times.

Replace the entire file with:

```js
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { randomUUID } = require("node:crypto");
const {
  DEBOUNCE_MS,
  shouldProceedAfterDebounce,
  shouldCommitRecompute,
} = require("./recomputeGuard");

initializeApp();
const db = getFirestore();

const CACHE_DOC = "leaderboardCache/current";
// Lives in leaderboardCache on purpose: that collection is already
// `read: true, write: false` in firestore.rules, and the Admin SDK bypasses
// rules — so the control doc needs no rules change at all, and no client can
// forge it.
const CONTROL_DOC = "leaderboardCache/control";

// Mirrors src/leaderboard/scoring.ts's computeScore/isPickCorrect exactly —
// duplicated here rather than imported, since this runs as plain JS
// (Firebase Functions), separate from the TypeScript client app, same
// convention as functions/stopbilling. Keep the two in sync if the scoring
// rule ever changes.
function isPickCorrect(predictedPosition, actualPosition) {
  return Math.abs(predictedPosition - actualPosition) < 3;
}
const POINTS_PER_CORRECT_PICK = 3;
function computeScore(ranking, results) {
  let score = 0;
  ranking.forEach((teamId, index) => {
    const result = results[teamId];
    if (!result) return;
    const predictedPosition = index + 1;
    if (isPickCorrect(predictedPosition, result.position)) {
      score += POINTS_PER_CORRECT_PICK;
    }
  });
  return score;
}

/**
 * Reads every input and returns the leaderboard entries. Pure with respect to
 * Firestore writes — it never stores anything, so the caller owns the decision
 * about whether its result is still fresh enough to keep.
 */
async function computeEntries() {
  const [predictionsSnap, profilesSnap, resultsSnap] = await Promise.all([
    db.collection("predictions").get(),
    // Projection: the leaderboard renders a first name and a photo, nothing
    // else. Billed reads are unchanged (a projection does not reduce document
    // count) and the saving is latency only, but it also keeps surnames out of
    // a function with no business reading them, consistent with the 2026-08-02
    // name-privacy split.
    //
    // Still reads `profiles`, NOT `publicProfiles`: profiles is the source of
    // truth, and depending on the mirror here would let a missing
    // publicProfiles doc silently drop a participant off the leaderboard.
    db.collection("profiles").select("firstName", "photoURL").get(),
    db.collection("results").get(),
  ]);

  const profilesById = new Map(profilesSnap.docs.map((doc) => [doc.id, doc.data()]));
  const results = {};
  resultsSnap.docs.forEach((doc) => {
    results[doc.id] = doc.data();
  });

  const entries = [];
  predictionsSnap.docs.forEach((doc) => {
    const profile = profilesById.get(doc.id);
    if (!profile) return;
    const prediction = doc.data();
    entries.push({
      uid: doc.id,
      firstName: profile.firstName,
      photoURL: profile.photoURL,
      points: computeScore(prediction.ranking, results),
      ranking: prediction.ranking,
      submittedAt: prediction.submittedAt,
    });
  });
  entries.sort((a, b) => b.points - a.points);
  return entries;
}

/**
 * Computes, then stores only if the result is still the freshest one available.
 *
 * The transaction is what makes the check-and-write atomic; Firestore is in
 * PESSIMISTIC concurrency mode, so competing transactions on the control doc
 * serialize rather than racing. shouldCommitRecompute keeps stored results
 * monotonic in read freshness, so an older read can never overwrite a newer
 * one — see recomputeGuard.js for why that, not the debounce, is the property
 * correctness actually rests on.
 */
async function runRecompute() {
  const readStartedAt = Date.now();
  const entries = await computeEntries();

  const controlRef = db.doc(CONTROL_DOC);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(controlRef);
    const control = snap.exists ? snap.data() : null;
    if (!shouldCommitRecompute(control, readStartedAt)) return;

    const now = Date.now();
    tx.set(db.doc(CACHE_DOC), { entries, computedAt: now });
    tx.set(
      controlRef,
      {
        computedAt: now,
        lastComputeReadStartedAt: readStartedAt,
        computedThroughRequestedAt: control ? control.requestedAt ?? 0 : 0,
        computeCount: FieldValue.increment(1),
      },
      { merge: true }
    );
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Every trigger calls this instead of recomputing directly.
 *
 * A single match outcome in the dev panel commits a batch that rewrites all 36
 * `results` docs (src/devpanel/useDevMatches.ts), and every doc whose value
 * actually changed fires its own trigger. Before this debounce that meant 5-15
 * concurrent full recomputes — each re-reading every prediction and profile,
 * all writing the same document, and able to interleave such that an older read
 * silently erased a just-submitted prediction from the leaderboard.
 *
 * Now they all stamp the control doc, sleep, and all but the newest stand down.
 */
async function requestRecompute() {
  const myToken = randomUUID();
  const controlRef = db.doc(CONTROL_DOC);
  await controlRef.set({ requestToken: myToken, requestedAt: Date.now() }, { merge: true });

  await sleep(DEBOUNCE_MS);

  const snap = await controlRef.get();
  const control = snap.exists ? snap.data() : null;
  if (!shouldProceedAfterDebounce(control, myToken, Date.now())) return;

  await runRecompute();
}

exports.recomputeLeaderboardOnPrediction = onDocumentWritten("predictions/{uid}", async () => {
  await requestRecompute();
});

exports.recomputeLeaderboardOnResult = onDocumentWritten("results/{teamId}", async () => {
  await requestRecompute();
});
```

**Do not add `module.exports.runRecompute`.** Firebase Functions treats *every* export of this module as a deployable function definition, so exporting a plain async helper makes the deploy fail on an untypeable function. Task 3's scheduled function lives in this same file and calls `runRecompute()` directly from module scope — no export is needed or wanted.

- [ ] **Step 2: Verify the file at least loads**

Run: `node -e "require('./functions/leaderboard/index.js')" 2>&1 | head -20`
Expected: it will fail on Admin SDK credentials (`Could not load the default credentials` or similar) — that is fine and expected outside a Firebase runtime. What must **not** appear is a `SyntaxError`, or `Cannot find module './recomputeGuard'`. If either appears, fix it before moving on.

- [ ] **Step 3: Confirm the app suite is untouched**

Run: `npm test`
Expected: PASS, still **971 tests / 127 files**. Nothing in `src/` imports this file, so the count must not move.

- [ ] **Step 4: Commit**

```bash
git add functions/leaderboard/index.js
git commit -m "fix: debounce leaderboard recomputes and guard the commit on read freshness

One match outcome rewrote all 36 results docs, firing 5-15 concurrent full
recomputes that each re-read every prediction and profile and all wrote the
same doc. They could also interleave so an older read silently erased a
just-submitted prediction from the leaderboard, with nothing scheduled to
re-trigger.

Triggers now stamp a control doc, sleep through a debounce window, and all
but the newest stand down. The commit is transactional and refuses any write
whose read began before the stored result's, making stored results monotonic
in read freshness."
```

---

### Task 3: The scheduled safety net

**Files:**
- Modify: `functions/leaderboard/index.js` (append one export)

**Interfaces:**
- Consumes: `runRecompute()` and `CONTROL_DOC` from Task 2's module scope.
- Produces: `exports.recomputeLeaderboardSafetyNet`.

- [ ] **Step 1: Append the scheduled function**

Add to the end of `functions/leaderboard/index.js`, and add `onSchedule` to the requires at the top:

```js
const { onSchedule } = require("firebase-functions/v2/scheduler");
```

```js
/**
 * Recomputes only when the control doc says inputs have moved since the last
 * successful compute. When idle this is one document read every 5 minutes.
 *
 * This exists so that a dropped trigger, a crashed invocation, or any
 * unforeseen everybody-stood-down interleaving is *self-healing* rather than
 * permanently wrong. "The leaderboard is quietly wrong" is the worst failure
 * this app has — it is the entire point of the site — so the debounce is not
 * trusted on its own.
 *
 * The region is pinned deliberately. Firestore triggers infer their region from
 * the database's location (europe-west8); onSchedule does NOT, and would
 * otherwise deploy to us-central1 and read cross-region.
 */
exports.recomputeLeaderboardSafetyNet = onSchedule(
  { schedule: "every 5 minutes", region: "europe-west8" },
  async () => {
    const snap = await db.doc(CONTROL_DOC).get();
    if (!snap.exists) return;
    const control = snap.data();
    if ((control.requestedAt ?? 0) <= (control.computedThroughRequestedAt ?? 0)) return;
    await runRecompute();
  }
);
```

- [ ] **Step 2: Verify it loads and the export exists**

Run: `node -e "const m=require('./functions/leaderboard/index.js'); console.log(Object.keys(m))" 2>&1 | head -20`
Expected: either the credentials error from Task 2 Step 2, or a key list containing `recomputeLeaderboardSafetyNet`. Again: no `SyntaxError`, and no `Cannot find module 'firebase-functions/v2/scheduler'` — if the latter appears, `firebase-functions` in `functions/leaderboard/node_modules` is missing or too old; run `npm install` inside `functions/leaderboard/`.

- [ ] **Step 3: Commit**

```bash
git add functions/leaderboard/index.js
git commit -m "feat: scheduled safety net so a dropped leaderboard trigger self-heals"
```

---

### Task 4: Emulator config and integration tests

**Files:**
- Modify: `firebase.json`
- Modify: `package.json`
- Create: `vitest.integration.config.ts`
- Create: `integration/leaderboardRecompute.itest.ts`

**Interfaces:**
- Consumes: the deployed-shape behaviour of Tasks 2 and 3 — specifically the `leaderboardCache/control` fields `computeCount` and `computedAt`, and `leaderboardCache/current.entries`.
- Produces: `npm run test:integration`.

**On what these tests can and cannot prove.** The storm test is deterministic: a 36-document batch either produces one recompute or it does not. The submission test is **not** a deterministic reproduction of the lost-update race — that race depends on read/write interleaving which cannot be forced from outside the function. It is a stress assertion of the observable guarantee ("no submitted prediction is ever missing"), which flakily *fails* on the pre-Task-2 code and must *always* pass after. The deterministic coverage of the guard logic lives in Task 1, and that split is deliberate.

- [ ] **Step 1: Add the emulators block to `firebase.json`**

Add as a sibling key to the existing `functions` key:

```json
  "emulators": {
    "firestore": { "port": 8080 },
    "functions": { "port": 5001 },
    "ui": { "enabled": false },
    "singleProjectMode": true
  }
```

- [ ] **Step 2: Add the script and the root devDependency**

In `package.json`, add to `scripts`:

```json
    "test:integration": "firebase emulators:exec --project kupatakipucl --only firestore,functions \"vitest run --config vitest.integration.config.ts\""
```

Then install the Admin SDK at the repo root so the test can talk to the emulator:

```bash
npm install --save-dev firebase-admin@^12.6.0
```

- [ ] **Step 3: Create `vitest.integration.config.ts`**

```ts
import { defineConfig } from "vitest/config";

// Separate from vite.config.ts on purpose. These tests need a real Firestore
// emulator, a node environment (no jsdom, no test/setup.ts DOM shims), and
// timeouts long enough to sit through the function's 2s debounce plus a
// recompute.
//
// The `.itest.ts` suffix is what keeps them out of `npm test`: vitest's default
// include only matches *.test.* and *.spec.*, so the main config needs no
// exclude rule and cannot accidentally drag these into the normal suite.
export default defineConfig({
  test: {
    environment: "node",
    include: ["integration/**/*.itest.ts"],
    testTimeout: 40000,
    hookTimeout: 40000,
    // The functions under test are triggered by writes and coalesce across
    // documents; running files in parallel would let one test's writes satisfy
    // another's debounce window.
    fileParallelism: false,
  },
});
```

- [ ] **Step 4: Write the integration tests**

Create `integration/leaderboardRecompute.itest.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

// `firebase emulators:exec` sets FIRESTORE_EMULATOR_HOST for us, which is what
// makes initializeApp() work with no credentials at all.
const TEAM_IDS = Array.from({ length: 36 }, (_, i) => `team-${i + 1}`);

let app: ReturnType<typeof initializeApp>;
let db: Firestore;

/** Longer than DEBOUNCE_MS (2000) plus a recompute, with real headroom. */
const QUIET_MS = 8000;
const settle = () => new Promise((resolve) => setTimeout(resolve, QUIET_MS));

async function wipe(): Promise<void> {
  for (const name of ["predictions", "profiles", "results", "leaderboardCache"]) {
    const snap = await db.collection(name).get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
  }
}

async function seedProfiles(count: number): Promise<void> {
  await Promise.all(
    Array.from({ length: count }, (_, i) =>
      db.doc(`profiles/u${i}`).set({ firstName: `P${i}`, lastName: "Test", photoURL: "" })
    )
  );
}

describe("leaderboard recompute under load", () => {
  beforeAll(() => {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
      throw new Error("Run via `npm run test:integration` — no emulator detected.");
    }
    app = initializeApp({ projectId: "kupatakipucl" });
    db = getFirestore(app);
  });

  afterAll(async () => {
    await deleteApp(app);
  });

  beforeEach(async () => {
    await wipe();
    // Let any triggers from the wipe itself drain, so their debounce windows
    // cannot bleed into the assertions below.
    await settle();
    await wipe();
  });

  // The storm: src/devpanel/useDevMatches.ts commits all 36 results docs for a
  // single match outcome. Before the debounce that fired 5-15 concurrent full
  // recomputes.
  it("collapses a 36-document results batch into exactly one recompute", async () => {
    await seedProfiles(3);
    await Promise.all(
      Array.from({ length: 3 }, (_, i) =>
        db.doc(`predictions/u${i}`).set({ ranking: TEAM_IDS, submittedAt: Date.now() })
      )
    );
    await settle();
    await db.doc("leaderboardCache/control").set({ computeCount: 0 }, { merge: true });

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
    await settle();

    const control = (await db.doc("leaderboardCache/control").get()).data();
    expect(control?.computeCount).toBe(1);
  });

  // The lost-update race, asserted as its observable guarantee. Flakily fails
  // before Task 2; must always pass after.
  it("never drops a prediction when many are submitted at once", async () => {
    const N = 25;
    await seedProfiles(N);
    await settle();

    await Promise.all(
      Array.from({ length: N }, (_, i) =>
        db.doc(`predictions/u${i}`).set({ ranking: TEAM_IDS, submittedAt: Date.now() + i })
      )
    );
    await settle();

    const cache = (await db.doc("leaderboardCache/current").get()).data();
    const entries = (cache?.entries ?? []) as { uid: string }[];
    expect(entries).toHaveLength(N);
    expect(new Set(entries.map((e) => e.uid)).size).toBe(N);
  });
});
```

- [ ] **Step 5: Install function deps, then run the integration suite**

The functions emulator runs the real function code, so its own dependencies must be present:

```bash
npm install --prefix functions/leaderboard
npm run test:integration
```

Expected: PASS, 2 tests. If the emulator cannot bind port 8080 or 5001, stop whatever is holding them rather than changing the ports — Task 4 Step 1's ports are what the script and any future runs assume.

- [ ] **Step 6: Confirm the normal suite still ignores these files**

Run: `npm test`
Expected: PASS, still **971 tests / 127 files**. If the count jumped by 2, the `.itest.ts` suffix is being matched by the default include and needs an explicit exclude in `vite.config.ts`.

- [ ] **Step 7: Commit**

```bash
git add firebase.json package.json package-lock.json vitest.integration.config.ts integration/
git commit -m "test: emulator integration tests for the recompute storm and submission load"
```

---

### Task 5: Cap chat search to a recent window

`src/chat/searchMessages.ts:28` is the only query in the app that is unbounded in time — `orderBy("createdAt","desc")` with no `limit()`, downloading the entire message collection per search click. At 250 people across a season that is tens of thousands of documents per click, growing daily.

**Files:**
- Modify: `src/chat/searchMessages.ts`
- Modify: `src/chat/searchMessages.test.ts`
- Modify: `src/chat/ChatRoom.tsx` (lines 8, 283-309, 375-377)
- Modify: `src/chat/ChatRoom.test.tsx` (lines 14-20)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `SEARCH_WINDOW: number` (2000), exported from `src/chat/searchMessages.ts`
  - `fetchRecentMessagesForSearch(lobbyId?: string | null): Promise<MessageWithId[]>` — **renamed** from `fetchAllMessagesForSearch`, same signature and return type.
  - `filterMessagesByTerm` and `searchMessages` keep their existing names and signatures.

- [ ] **Step 1: Write the failing tests**

In `src/chat/searchMessages.test.ts`, add `limit` to the firestore mock (the existing mock does not export it, so the import in the implementation would throw), and follow the rename. Change the mock block and import to:

```ts
const mockGetDocs = vi.fn();
const mockCollection = vi.fn((_db: unknown, ...path: string[]) => ({ path }));
const mockQuery = vi.fn((ref: unknown) => ref);
const mockOrderBy = vi.fn((field: string) => ({ field }));
const mockLimit = vi.fn((n: number) => ({ limit: n }));

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, ...string[]])),
  query: (...args: unknown[]) => mockQuery(...(args as [unknown])),
  orderBy: (...args: unknown[]) => mockOrderBy(...(args as [string])),
  limit: (...args: unknown[]) => mockLimit(...(args as [number])),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { fetchRecentMessagesForSearch, searchMessages, SEARCH_WINDOW } from "./searchMessages";
```

Replace the three existing references to `fetchAllMessagesForSearch` (lines 58, 64, 74 of the current file) with `fetchRecentMessagesForSearch`, add `mockLimit.mockClear();` to the `beforeEach`, and add these tests:

```ts
  // Was unbounded: one search click downloaded every message ever sent, which
  // at 250 participants over a season is tens of thousands of documents and
  // grows daily (scaling-250 design spec, 2026-08-07, S3).
  it("caps the fetch to the most recent SEARCH_WINDOW messages", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    await fetchRecentMessagesForSearch();
    expect(mockLimit).toHaveBeenCalledWith(SEARCH_WINDOW);
  });

  it("caps a lobby-scoped search the same way", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    await fetchRecentMessagesForSearch("lobby1");
    expect(mockLimit).toHaveBeenCalledWith(SEARCH_WINDOW);
  });

  it("uses a window of 2000", () => {
    expect(SEARCH_WINDOW).toBe(2000);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/chat/searchMessages.test.ts`
Expected: FAIL — `fetchRecentMessagesForSearch` and `SEARCH_WINDOW` are not exported.

- [ ] **Step 3: Implement the cap and the rename**

In `src/chat/searchMessages.ts`, change the import on line 1 to include `limit`, replace the doc comment's stale justification, and rename the function:

```ts
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
```

```ts
/**
 * Bounded at the most recent SEARCH_WINDOW messages.
 *
 * This used to fetch the entire collection, justified as "this app's whole
 * history is small enough (a friend-group season, not a public product)" —
 * an assumption 250 participants retires. At even 150 messages/day across a
 * September-May season that is ~40,000 documents per search click, multiple
 * megabytes parsed on the main thread, growing every day and recurring on
 * every search. It was the only query in the app unbounded in time
 * (scaling-250 design spec, 2026-08-07, S3).
 *
 * Accepted trade-off, chosen by Mert on 2026-08-07: a message older than the
 * window is not findable. That matches how the forum already behaves —
 * usePosts' search only filters what has been paged in.
 *
 * There is still no search index behind this: Firestore has no substring
 * query, so it remains a fetch plus a client-side filter. Only the fetch is
 * now bounded.
 *
 * `lobbyId` scopes the fetch to one lobby's own messages subcollection.
 * special-lobby-round-7 Q2 locks search to "confined to the current view —
 * search General, or search one lobby, never mixed", so this is a switch
 * between two collections, never a union of both (2026-07-30,
 * final-review fix).
 */
export const SEARCH_WINDOW = 2000;

export async function fetchRecentMessagesForSearch(
  lobbyId: string | null = null
): Promise<MessageWithId[]> {
  const messagesRef = lobbyId ? collection(db, "lobbies", lobbyId, "messages") : collection(db, "messages");
  const messagesQuery = query(messagesRef, orderBy("createdAt", "desc"), limit(SEARCH_WINDOW));
  const snapshot = await getDocs(messagesQuery);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Message) }));
}
```

Update `searchMessages`'s body to call the renamed function:

```ts
export async function searchMessages(term: string, lobbyId: string | null = null): Promise<MessageWithId[]> {
  const trimmed = term.trim();
  if (!trimmed) return [];
  const all = await fetchRecentMessagesForSearch(lobbyId);
  return filterMessagesByTerm(all, trimmed);
}
```

Keep this paragraph from the original doc comment, verbatim, in the block above `fetchRecentMessagesForSearch` — it explains why fetch and filter are two functions, which this change does not alter:

> Split into two pieces (not-started-audit item 18) so ChatRoom.tsx can fetch once per search session and filter every keystroke against that same in-memory list, instead of re-running a full collection fetch on every debounced keystroke. `searchMessages` composes both, kept as the simple one-shot entry point these existing tests already cover.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/chat/searchMessages.test.ts`
Expected: PASS, 9 tests (6 existing + 3 new).

- [ ] **Step 5: Follow the rename and add the saturation notice in `ChatRoom.tsx`**

Line 8 — update the import:

```ts
import { fetchRecentMessagesForSearch, filterMessagesByTerm, SEARCH_WINDOW } from "./searchMessages";
```

Add state next to the other search state (near `searching` / `searchResults`):

```tsx
  // True when the fetch came back exactly full, i.e. there is older history the
  // window did not cover — used only to keep the no-results message honest.
  const [searchWindowFull, setSearchWindowFull] = useState(false);
```

In the effect at lines 295-307, use the renamed function and record saturation. Replace the `const id = setTimeout(...)` body's `load` chain with:

```tsx
    const id = setTimeout(() => {
      const cached = allMessagesCacheRef.current;
      const load = cached
        ? Promise.resolve(cached)
        : fetchRecentMessagesForSearch(lobbyId).then((all) => {
            allMessagesCacheRef.current = all;
            return all;
          });
      load
        .then((all) => {
          setSearchWindowFull(all.length >= SEARCH_WINDOW);
          setSearchResults(filterMessagesByTerm(all, trimmed));
        })
        .catch((err) => console.error("Failed to search messages", err))
        .finally(() => setSearching(false));
    }, SEARCH_DEBOUNCE_MS);
```

Lines 375-377 — extend the empty state. Only says anything extra when the window was actually full, so it stays silent in the normal case:

```tsx
          {!searching && searchQuery.trim() && searchResults.length === 0 && (
            <p className="text-center text-xs text-color_textsecondary">
              {searchWindowFull
                ? `Sonuç bulunamadı. Arama son ${SEARCH_WINDOW} mesajı kapsıyor.`
                : "Sonuç bulunamadı."}
            </p>
          )}
        </div>
```

- [ ] **Step 6: Follow the rename in `ChatRoom.test.tsx`**

At lines 14-20, rename the mocked export. Also rename the local mock fn for readability:

```ts
vi.mock("./searchMessages", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./searchMessages")>();
  return {
    ...actual,
    fetchRecentMessagesForSearch: (...args: unknown[]) => mockFetchRecentMessagesForSearch(...args),
  };
});
```

Rename every `mockFetchAllMessagesForSearch` occurrence in the file to `mockFetchRecentMessagesForSearch` (including its `vi.fn()` declaration near the top and all `mockResolvedValue` calls). Then add one test in the search describe block, next to the existing "shows no results" test at line 219:

```ts
    it("says the search only covered recent messages when the window came back full", async () => {
      const full = Array.from({ length: SEARCH_WINDOW }, (_, i) => ({
        id: `m${i}`,
        uid: "u1",
        text: "alakasız",
        createdAt: i,
      }));
      mockFetchRecentMessagesForSearch.mockResolvedValue(full);
      renderRoom({ messages: [] });
      fireEvent.click(screen.getByRole("button", { name: "Sohbette ara" }));
      fireEvent.change(screen.getByPlaceholderText("Sohbette ara…"), {
        target: { value: "yok böyle bir şey" },
      });
      expect(
        await screen.findByText(`Sonuç bulunamadı. Arama son ${SEARCH_WINDOW} mesajı kapsıyor.`)
      ).toBeInTheDocument();
    });
```

Add `SEARCH_WINDOW` to this file's imports from `./searchMessages`.

- [ ] **Step 7: Verify the whole suite and the build**

Run: `npm test`
Expected: PASS, **975 tests / 127 files** (971 + 3 in searchMessages + 1 in ChatRoom). No file count change.

Run: `npx tsc -b && npx vite build`
Expected: both clean. `tsc` is the real check that no stale `fetchAllMessagesForSearch` reference survives anywhere.

- [ ] **Step 8: Commit**

```bash
git add src/chat/searchMessages.ts src/chat/searchMessages.test.ts src/chat/ChatRoom.tsx src/chat/ChatRoom.test.tsx
git commit -m "perf: cap chat search to the most recent 2000 messages

The only query in the app unbounded in time: it fetched the entire message
collection per search click, justified by a friend-group-scale assumption
that 250 participants retires. Renamed off 'All' since it no longer is, and
the no-results message now says when older history was out of range."
```

---

### Task 6: Cache the two survey/submitter fetches

Both are full-collection fetches that grow to 250 documents, and both are among the only data hooks not wired into the existing `src/lib/sessionCache.ts`. `usePredictionSubmitters` is the worse of the two: it downloads all 250 prediction documents — **each carrying a 36-element `ranking` array, roughly 150 KiB** — purely to read their document IDs, it runs on `LoggedInHome` (the most-visited signed-in page), and it **gates first paint** via that page's loading guard.

**Files:**
- Modify: `src/predictions/usePredictionSubmitters.ts`
- Modify: `src/predictions/usePredictionSubmitters.test.ts`
- Modify: `src/predictions/useSurveyResponses.ts`
- Modify: `src/predictions/useSurveyResponses.test.ts`

**Interfaces:**
- Consumes: `getCached`, `setCached` from `src/lib/sessionCache.ts` (existing); `clearSessionCache` in tests.
- Produces: no signature changes. `usePredictionSubmitters()` still returns `{ submitterUids: Set<string>; loading: boolean }`; `useSurveyResponses()` still returns `{ responses: SurveyResponseEntry[]; loading: boolean }`.

**Note on the cached type for `usePredictionSubmitters`:** `sessionCache` persists via `JSON.stringify`, and a `Set` does not survive that. Cache a `string[]` and rebuild the `Set` on read.

- [ ] **Step 1: Write the failing tests**

In `src/predictions/usePredictionSubmitters.test.ts`, add the import and a `clearSessionCache()` call in `beforeEach`:

```ts
import { clearSessionCache } from "../lib/sessionCache";
```

Then add:

```ts
  it("serves a second mount from the session cache without refetching", async () => {
    mockGetDocs.mockResolvedValue({ docs: [{ id: "u1" }, { id: "u2" }] });
    const first = renderHook(() => usePredictionSubmitters());
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    expect(mockGetDocs).toHaveBeenCalledTimes(1);

    const second = renderHook(() => usePredictionSubmitters());
    // Already populated on the very first render — no skeleton, no second read
    // of 250 prediction docs.
    expect(second.result.current.loading).toBe(false);
    expect(second.result.current.submitterUids).toEqual(new Set(["u1", "u2"]));
    expect(mockGetDocs).toHaveBeenCalledTimes(1);
  });
```

Apply the identical pattern to `src/predictions/useSurveyResponses.test.ts`, asserting on `responses` instead:

```ts
  it("serves a second mount from the session cache without refetching", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [{ id: "u1", data: () => ({ age: 30, footballKnowledge: 5 }) }],
    });
    const first = renderHook(() => useSurveyResponses());
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    expect(mockGetDocs).toHaveBeenCalledTimes(1);

    const second = renderHook(() => useSurveyResponses());
    expect(second.result.current.loading).toBe(false);
    expect(second.result.current.responses).toHaveLength(1);
    expect(mockGetDocs).toHaveBeenCalledTimes(1);
  });
```

Add `clearSessionCache` to that file's `beforeEach` too. Both files already import `renderHook, waitFor` from `@testing-library/react` on line 1, so the only new import in each is `clearSessionCache`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/predictions/usePredictionSubmitters.test.ts src/predictions/useSurveyResponses.test.ts`
Expected: FAIL — the second mount refetches, so `mockGetDocs` was called twice and `loading` was `true`.

- [ ] **Step 3: Implement caching in `usePredictionSubmitters.ts`**

```ts
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { getCached, setCached } from "../lib/sessionCache";

const CACHE_KEY = "predictionSubmitters";

/** Just the set of uids with a `predictions/{uid}` doc — who has submitted,
 *  not what they submitted.
 *
 *  Wired into sessionCache 2026-08-07 (scaling-250 design spec S4): this is a
 *  full-collection fetch that grows to 250 docs, and because prediction docs
 *  each carry a 36-element ranking array it moves ~150 KiB purely to read
 *  document ids. It also gates first paint on LoggedInHome, the most-visited
 *  signed-in page, so a repeat visit paying for it again was a visible cost as
 *  well as a billed one. A genuinely cold visit still pays it once — fine at
 *  this site's ~500-participant ceiling (scaling-audit No. 13, 2026-07-31).
 *
 *  Cached as a string[] rather than a Set: sessionCache persists through
 *  JSON.stringify, which a Set does not survive. */
export function usePredictionSubmitters() {
  const cached = getCached<string[]>(CACHE_KEY);
  const [submitterUids, setSubmitterUids] = useState<Set<string>>(() => new Set(cached ?? []));
  const [loading, setLoading] = useState(cached === undefined);

  useEffect(() => {
    let ignore = false;
    getDocs(collection(db, "predictions"))
      .then((snapshot) => {
        if (ignore) return;
        const uids = snapshot.docs.map((docSnap: { id: string }) => docSnap.id);
        setCached(CACHE_KEY, uids);
        setSubmitterUids(new Set(uids));
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load prediction submitters", err);
        if (ignore) return;
        setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  return { submitterUids, loading };
}
```

Note the fetch still runs on a warm cache — it silently reconciles rather than being skipped, exactly the pattern `useMessages`/`usePlayers` already use. What the cache removes is the *skeleton*, and (via `sessionCache`'s 5-minute localStorage layer) the refetch on a genuine reload.

- [ ] **Step 4: Implement caching in `useSurveyResponses.ts`**

```ts
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { SurveyResponse } from "./surveyTypes";
import { getCached, setCached } from "../lib/sessionCache";

export interface SurveyResponseEntry extends SurveyResponse {
  uid: string;
}

const CACHE_KEY = "surveyResponses";

/** Every participant's quiz answers — a full-collection fetch that grows to
 *  250 docs, paid on every Stats visit. Wired into sessionCache 2026-08-07
 *  (scaling-250 design spec S4), same pattern as the other one-shot hooks. */
export function useSurveyResponses() {
  const cached = getCached<SurveyResponseEntry[]>(CACHE_KEY);
  const [responses, setResponses] = useState<SurveyResponseEntry[]>(cached ?? []);
  const [loading, setLoading] = useState(cached === undefined);

  useEffect(() => {
    let ignore = false;
    getDocs(collection(db, "surveyResponses"))
      .then((snapshot) => {
        if (ignore) return;
        const next = snapshot.docs.map((docSnap: { id: string; data: () => unknown }) => ({
          uid: docSnap.id,
          ...(docSnap.data() as SurveyResponse),
        }));
        setCached(CACHE_KEY, next);
        setResponses(next);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load survey responses", err);
        if (ignore) return;
        setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  return { responses, loading };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/predictions/usePredictionSubmitters.test.ts src/predictions/useSurveyResponses.test.ts`
Expected: PASS.

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS, **977 tests / 127 files**. Watch specifically for failures in `LoggedInHome.test.tsx` and `StatsPage.test.tsx` — a hook that now returns data on its first render instead of after a tick can make a test that asserted on a loading state fail. If one does, the test's assumption is what changed, not the behaviour; fix the test and say so in the commit.

- [ ] **Step 7: Commit**

```bash
git add src/predictions/usePredictionSubmitters.ts src/predictions/usePredictionSubmitters.test.ts src/predictions/useSurveyResponses.ts src/predictions/useSurveyResponses.test.ts
git commit -m "perf: session-cache the submitter and survey-response fetches

Both grow to 250 docs. usePredictionSubmitters moves ~150 KiB of ranking
arrays purely to read document ids, and gates first paint on LoggedInHome."
```

---

### Task 7: Cache the knockout-predictions fetch, and give it its first test

250 reads per `TeamPopup` / `MatchupPopup` open, repeated on every re-open. This hook currently has **no test file at all**.

**Files:**
- Modify: `src/knockout/useAllKnockoutPredictions.ts`
- Create: `src/knockout/useAllKnockoutPredictions.test.ts`

**Interfaces:**
- Consumes: `getCached`, `setCached` from `src/lib/sessionCache.ts`.
- Produces: no signature change — `useAllKnockoutPredictions()` still returns `{ predictions: Record<string, KnockoutPrediction>; loading: boolean }`. `RO16_TEAM_IDS` and `getKnockoutStageBadge` are untouched.

- [ ] **Step 1: Write the failing test**

Create `src/knockout/useAllKnockoutPredictions.test.ts`:

```ts
import { renderHook, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { clearSessionCache } from "../lib/sessionCache";

const mockGetDocs = vi.fn();
const mockCollection = vi.fn((_db: unknown, name: string) => ({ name }));

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, string])),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { useAllKnockoutPredictions } from "./useAllKnockoutPredictions";

describe("useAllKnockoutPredictions", () => {
  beforeEach(() => {
    mockGetDocs.mockReset();
    mockCollection.mockClear();
    clearSessionCache();
  });

  it("reads the knockoutPredictions collection", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    const { result } = renderHook(() => useAllKnockoutPredictions());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockCollection).toHaveBeenCalledWith({}, "knockoutPredictions");
  });

  it("maps each doc into a record keyed by uid", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [{ id: "u1", data: () => ({ champion: "arsenal" }) }],
    });
    const { result } = renderHook(() => useAllKnockoutPredictions());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.predictions).toEqual({ u1: { champion: "arsenal" } });
  });

  it("stops loading and stays empty when the read fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetDocs.mockRejectedValue(new Error("permission-denied"));
    const { result } = renderHook(() => useAllKnockoutPredictions());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.predictions).toEqual({});
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to load all knockout predictions",
      expect.any(Error)
    );
    consoleErrorSpy.mockRestore();
  });

  // 250 reads per popup open, repeated on every re-open, before this.
  it("serves a re-opened popup from the session cache without refetching", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [{ id: "u1", data: () => ({ champion: "arsenal" }) }],
    });
    const first = renderHook(() => useAllKnockoutPredictions());
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    expect(mockGetDocs).toHaveBeenCalledTimes(1);

    const second = renderHook(() => useAllKnockoutPredictions());
    expect(second.result.current.loading).toBe(false);
    expect(second.result.current.predictions).toEqual({ u1: { champion: "arsenal" } });
    expect(mockGetDocs).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/knockout/useAllKnockoutPredictions.test.ts`
Expected: the first three tests PASS (they describe existing behaviour), the cache test FAILS — second mount refetches and starts in a loading state.

A partially-passing new test file is the intended state here: three of these tests are pinning behaviour that already works and must survive the change, which is the point of writing them before touching the hook.

- [ ] **Step 3: Implement caching**

In `src/knockout/useAllKnockoutPredictions.ts`, add the import and rewrite only the hook — leave `RO16_TEAM_IDS` and `getKnockoutStageBadge` exactly as they are:

```ts
import { getCached, setCached } from "../lib/sessionCache";
```

```ts
const CACHE_KEY = "allKnockoutPredictions";

/** Every participant's knockout bracket, keyed by uid. Read by TeamPopup and
 *  MatchupPopup, so before sessionCache (2026-08-07, scaling-250 design spec
 *  S4) every popup open — and every re-open — paid a fresh full-collection
 *  fetch that grows to 250 docs. */
export function useAllKnockoutPredictions() {
  const cached = getCached<Record<string, KnockoutPrediction>>(CACHE_KEY);
  const [predictions, setPredictions] = useState<Record<string, KnockoutPrediction>>(cached ?? {});
  const [loading, setLoading] = useState(cached === undefined);

  useEffect(() => {
    let ignore = false;
    getDocs(collection(db, "knockoutPredictions"))
      .then((snapshot) => {
        if (ignore) return;
        const map: Record<string, KnockoutPrediction> = {};
        snapshot.docs.forEach((doc) => {
          map[doc.id] = doc.data() as KnockoutPrediction;
        });
        setCached(CACHE_KEY, map);
        setPredictions(map);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load all knockout predictions", err);
        if (ignore) return;
        setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  return { predictions, loading };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/knockout/useAllKnockoutPredictions.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Full verification**

Run: `npm test`
Expected: PASS, **981 tests / 128 files**.

Run: `npx tsc -b && npx vite build`
Expected: both clean.

- [ ] **Step 6: Commit**

```bash
git add src/knockout/useAllKnockoutPredictions.ts src/knockout/useAllKnockoutPredictions.test.ts
git commit -m "perf: session-cache the knockout-predictions fetch, with its first tests

250 reads per TeamPopup/MatchupPopup open, repeated on every re-open. The
hook had no test file at all; three of the four new tests pin behaviour that
already worked so it survives the change."
```

---

### Task 8: Measure it against production, once

Everything before this proves the fix is internally consistent and correct under an emulator. This task produces the number that actually answers the mandate. It is deliberately last, deliberately manual, and **deliberately gated**.

**Files:** none — this task writes no code. It ends by appending findings to the spec.

**Interfaces:**
- Consumes: the deployed Tasks 2–3.
- Produces: real recompute latency, documents-read, and invocations-per-match figures, recorded in the spec's §5.

- [ ] **Step 1: Ask before touching production**

**STOP. Do not proceed without Mert's explicit go-ahead in this session**, per the spec's §5 decision. This step writes ~200 dummy documents to the live project and deploys functions. Confirm both:
1. Deploying `functions/leaderboard` to production now is wanted.
2. Seeding to 250 participants and then removing the dummies is wanted now.

- [ ] **Step 2: Deploy the functions**

```bash
firebase deploy --only functions:leaderboard
```

Expected: three functions reported — `recomputeLeaderboardOnPrediction`, `recomputeLeaderboardOnResult` (updated), and `recomputeLeaderboardSafetyNet` (created). Confirm the region:

```bash
gcloud run services list --format="table(metadata.name,metadata.labels['cloud.googleapis.com/location'])"
```

Expected: all three in `europe-west8`. If the safety net landed in `us-central1`, the `region` option in Task 3 did not take effect — fix and redeploy rather than accepting it.

Note: the deploy may warn that Node 20 is deprecated (decommissions 2026-10-30) and that `firebase-functions` is outdated. Both are pre-existing and tracked in `HANDOVER.md`'s 2026-08-02 entry; neither blocks this.

- [ ] **Step 3: Seed production up to 250 participants**

Verified production state as of 2026-08-07: **exactly 50 dummies (`dummy-001`…`dummy-050`) plus 3 real Google accounts.** Collection totals are `profiles` 53, `publicProfiles` 53, `predictions` 52, `surveyResponses` 54.

`scripts/seed-dummy-participants.mjs` writes `profiles/dummy-NNN` and `predictions/dummy-NNN` over a **hardcoded `for (let i = 1; i <= 50; i++)` loop at line 88 — there is no count argument**, so re-running it just overwrites the same 50 documents. To reach 250, change that loop's bounds to start at 51 and end at 250:

```js
  for (let i = 51; i <= 250; i++) {
```

That adds `dummy-051`…`dummy-250` — 200 new participants — leaving the existing 50 and the 3 real accounts untouched, for 253 profiles and 252 predictions total. Revert the loop bounds afterwards; **do not commit that edit.**

Two things deliberately *not* done here. `publicProfiles` is not backfilled: the recompute reads `profiles`, so the mirror has no bearing on what is being measured, and skipping it keeps cleanup to two collections. `surveyResponses` is not seeded either, for the same reason — nothing in the leaderboard function reads it.

- [ ] **Step 4: Trigger one match result and read the real numbers**

Change a single `results` document to a genuinely different value (an identical write is a silent no-op that fires no trigger — established 2026-08-02), then:

```bash
gcloud functions logs read recomputeLeaderboardOnResult --region=europe-west8 --limit=60
```

Record, and paste into the spec's §5:
- invocations fired for the one change (expected: several, all but one standing down after ~2s)
- how many actually recomputed (expected: **exactly 1** — cross-check by reading `leaderboardCache/control.computeCount` before and after)
- wall-clock duration of the recompute at 250 predictions
- resulting `leaderboardCache/current` document size

```bash
TOKEN=$(gcloud auth print-access-token)
curl -s "https://firestore.googleapis.com/v1/projects/kupatakipucl/databases/(default)/documents/leaderboardCache/control" -H "Authorization: Bearer $TOKEN"
```

- [ ] **Step 5: Remove the 200 added dummies and confirm the baseline is restored**

Delete exactly `dummy-051`…`dummy-250` from `profiles` and `predictions` — and nothing else. The original `dummy-001`…`dummy-050` are the project's existing pre-launch seed state and must survive; the 3 real accounts obviously must too.

```bash
TOKEN=$(gcloud auth print-access-token)
for i in $(seq -f "%03g" 51 250); do
  for C in profiles predictions; do
    curl -s -o /dev/null -X DELETE \
      "https://firestore.googleapis.com/v1/projects/kupatakipucl/databases/(default)/documents/$C/dummy-$i" \
      -H "Authorization: Bearer $TOKEN"
  done
done
```

Then confirm the counts are back to the exact 2026-08-07 baseline:

```bash
TOKEN=$(gcloud auth print-access-token)
for C in profiles publicProfiles predictions surveyResponses; do
  N=$(curl -s -X POST "https://firestore.googleapis.com/v1/projects/kupatakipucl/databases/(default)/documents:runAggregationQuery" \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"structuredAggregationQuery\":{\"structuredQuery\":{\"from\":[{\"collectionId\":\"$C\"}]},\"aggregations\":[{\"count\":{},\"alias\":\"c\"}]}}" \
    | tr -d '\n' | sed -n 's/.*\"integerValue\": *\"\([0-9]*\)\".*/\1/p')
  echo "$C = $N"
done
```

Expected exactly: `profiles = 53`, `publicProfiles = 53`, `predictions = 52`, `surveyResponses = 54`. Any other number means cleanup was incomplete — resolve it now, not later.

Finally, force one real recompute (a genuine value change to a `results` doc, then revert it — an identical write is a silent no-op) so `leaderboardCache/current` no longer holds the 250-entry measurement state. Confirm it is back to 52 entries before considering this task done.

- [ ] **Step 6: Commit the measurements**

```bash
git add docs/superpowers/specs/2026-08-07-scaling-250-users-design.md
git commit -m "docs: real production measurements at 250 participants"
```

---

## Verification Summary

| Checkpoint | Command | Expected |
| --- | --- | --- |
| Baseline (verified 2026-08-07) | `npm test` | 960 tests / 126 files |
| After Task 1 | `npm test` | 971 / 127 |
| After Task 2 | `npm test` | 971 / 127 (unchanged) |
| After Task 4 | `npm run test:integration` | 2 passed |
| After Task 5 | `npm test` | 975 / 127 |
| After Task 6 | `npm test` | 977 / 127 |
| After Task 7 | `npm test` + `tsc -b` + `vite build` | 981 / 128, both clean |

These counts assume no existing test needed adjustment. Task 6 is the one most likely to break that assumption — a hook that now returns data on its first render can fail a test that asserted on a loading state. If a count comes out different, state the real number and the reason in that task's commit; a changed count with a stated reason is fine, an unexplained one is not.

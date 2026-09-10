# fixtures

Four Cloud Functions that sync the real UEFA Champions League league-phase
table and fixture calendar from
[football-data.org](https://www.football-data.org). Two of them do the
actual syncing; the other two exist purely to decide *when* that syncing
runs — see "Live scheduling" below for why that's a whole section of its
own.

- **`resultsPollTick`** (calls `syncResults()`) → `results/{teamId}`,
  replacing the dev panel's synthetic 1-0/0-0 scorelines as the production
  source of truth once the league phase starts (2026-09-08). Writes the
  exact same collection `src/devpanel/useDevMatches.ts` writes by hand, so
  `functions/leaderboard`'s existing `onDocumentWritten("results/{teamId}")`
  trigger picks up every sync automatically — no other wiring needed.
- **`fixturesPollTick`** (calls `syncFixtures()`) → `fixtures/{id}` — the
  full 144-match calendar (past and future), `id` being football-data.org's
  own match id. A brand new collection, unrelated to
  `src/devpanel/fixtures.ts`.
- **`planKickoffTasks`** and **`handleFixtureArrival`** don't sync anything
  themselves — they schedule *when* the two functions above run. See "Live
  scheduling" below.

## Setup

Requires a football-data.org API token (free tier — no card, `CL` is free
forever) stored as a Firebase Functions v2 secret:

```
firebase functions:secrets:set FOOTBALL_DATA_TOKEN --project kupatakipucl
```

Deploy:

```
firebase deploy --only functions:fixtures
```

## Team id mapping

football-data.org's numeric team ids have no relationship to this app's
`src/predictions/teams.ts` slugs. `teamIdMap.js` hand-maps all 36, built
against a live `/v4/competitions/CL/standings` response on 2026-09-07.
`teamIdMap.test.js` asserts it still covers exactly the 36 teams in
`teams.ts`, in both directions — if either list ever changes, the mismatch
fails loudly there instead of silently dropping a team out of `results`.

## Live scheduling — task-based, added 2026-09-07, rearchitected 2026-09-10

**History first, because the current design only makes sense in light of
what didn't work.** This started 2026-09-07 as `pollGate.js` gating a flat
`onSchedule("every 2 minutes")`: poll aggressively in a live window, sparsely
otherwise. On 2026-09-09 the budget killswitch (PROJECT.md §1) tripped
three times in one day. The first trip was a write storm (fixed by
docDiff.js, above); the third trip, 6 minutes after a live sync had just
succeeded, traced to the schedule itself — `pollGate.js` only ever decided
whether a *tick* did real work, not whether the tick happened. Cloud
Scheduler fired on its raw cadence 24/7, all month, cold-starting a Cloud
Run instance every single time regardless of match activity. Widening that
interval (2 → 10 minutes, same day) was a stopgap: it shrank the idle cost,
it didn't remove it.

**The actual fix, 2026-09-10, removes the recurring idle schedule
entirely.** Instead of a job that wakes up every N minutes forever and asks
"is anything live," each fixture gets exactly one precisely-timed wake-up
call shortly before its own kickoff, which then self-perpetuates a tight
poll loop for as long as something is actually live and stops itself the
moment nothing is. Between kickoffs, nothing is scheduled at all — zero
recurring cost, not just a smaller one.

Four pieces, all in `index.js`:

- **`planKickoffTasks`** (`onSchedule("every 6 hours")`) — the only
  recurring schedule left. Looks at fixtures kicking off in the next 12
  hours (`kickoffPlanner.js`'s `PLANNER_LOOKAHEAD_MS`, comfortably 2x its
  own 6-hour interval so no kickoff can fall in the gap between two runs)
  and enqueues a Cloud Task for each — `ARRIVAL_LEAD_MS` (10 minutes)
  ahead of kickoff, not meant to be precise to the minute. A deterministic
  task id per fixture (`arrival-${fixtureId}`) makes re-running this
  harmless: an already-scheduled fixture just gets a "task already exists"
  rejection, caught and ignored. Also self-heals a dropped arrival task
  (Cloud Tasks delivery isn't 100% guaranteed) by checking `pollGate.js`
  directly, the same role `recomputeLeaderboardSafetyNet` plays for the
  leaderboard.
- **`handleFixtureArrival`** — fires once per fixture, at the time
  `planKickoffTasks` scheduled. Tries to start both poll chains
  (`ensureChainRunning` in `index.js`); each is a no-op if that chain is
  already running, which is the normal case whenever several fixtures kick
  off close together — a whole matchday's worth of arrivals only ever
  starts one chain of each kind. `syncControl.js`'s `claimChainStart` is a
  Firestore transaction that makes this race-safe even if two arrivals fire
  within the same second.
- **`fixturesPollTick`** / **`resultsPollTick`** — one tick each: sync
  (`syncFixtures()`/`syncResults()`), then check `pollGate.js`'s
  `isWithinLiveWindow` against a fresh `getRecentFixtures` read. Still live
  → enqueue the next tick 2 minutes out (`LIVE_TICK_INTERVAL_SECONDS`, back
  down from the 10-minute stopgap — safe to keep tight now that idle time
  costs nothing). Not live any more → `markChainStopped`. Kept as two fully
  independent chains, control docs, and functions — same reasoning
  `syncFixtures`'s own history already established: a bug in one still
  can't take the other down.

`kickoffPlanner.js` holds the pure "which fixtures need an arrival task"
logic (unit-tested, `kickoffPlanner.test.js`); `pollGate.js` holds the pure
"is anything live right now" logic used by both the tick's continue/stop
decision and the planner's self-heal check (`pollGate.test.js`). Everything
that touches Cloud Tasks or a Firestore transaction lives in `index.js`
and `syncControl.js` and is deliberately thin — kept simple enough to
review by inspection.

**Region: the three `onTaskDispatched` functions run in `europe-west6`
(Zurich), not `europe-west8` like everything else in this app.** Discovered
at first deploy attempt, 2026-09-09: Cloud Tasks doesn't support
`europe-west8` (Milan) as a location at all — `gcloud tasks locations list`
doesn't include it. `europe-west6` is the closest supported region.
`planKickoffTasks` itself stays on `europe-west8` (it's a plain
`onSchedule`, no Cloud Tasks involved); only `TASK_REGION` in `index.js`
(the three task-dispatched functions, and the `taskQueue()` helper that
addresses them) uses `europe-west6`. Worth knowing if this ever needs
redeploying by hand: get the region wrong and the deploy fails with
`Location '...' is not a valid location`, and — found the hard way —
Firebase's own `functions:delete` for a task-queue function also fails if
its Cloud Tasks queue is already broken (tries to pause the queue before
deleting the function, 400s on the same invalid-location error, and aborts
before reaching the function). `gcloud functions delete <name> --gen2
--region=<region>` bypasses that and deletes the underlying Cloud Run
resource directly.

Before this deployed, the only verification available was `firebase
emulators:start --only functions` loading all four functions cleanly and
auto-creating their Cloud Tasks queues — structural validation, not proof
the chain logic is bug-free under real task delivery. Deployed for real
2026-09-09 (region fixed on the second attempt, above) once billing was
back; 2026-09-09's own Matchday 1 was already in progress by then, so it's
being watched closely as the first real run rather than a clean first
matchday.

football-data.org's Free tier caps at 10 requests/**minute**, so none of
this — then or now — was ever about protecting the API cap; it's entirely
about not paying Google to ask "is anything live" every couple of minutes,
all month, regardless of the answer.

## The dev panel fallback

`src/devpanel/useDevMatches.ts`'s manual "mark match decided" flow still
works exactly as before — nothing here touches it. But since results sync
writes the same `results` collection, anything the dev panel writes there
only survives until the next successful sync. That's intentional for
bridging a football-data.org outage; it is NOT a way to make a correction
stick. `devMatches` and `src/devpanel/fixtures.ts`'s mock calendar are never
read or written by anything in this codebase — Mert's call, 2026-09-07: he
doesn't use the dev panel to flip matches in production and didn't want it
touched, so every production consumer was repointed at the real
`fixtures`/`results` collections instead, leaving the dev panel fully
isolated for local testing.

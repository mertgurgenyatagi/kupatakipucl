# Scaling to 250 participants — design spec

**Date:** 2026-08-07
**Mandate (Mert, verbatim):** *"This website must work with 250 people. It's your job now to ensure
that. There might be 40-50 people online at a time at maximum. The website must be able to handle
that. im not talking about the safety issues, those are to be solved before launch. I'm talking
about chat, forum, any sort of request. See to it."*

Target: **250 registered participants, 40–50 concurrent.** Today production holds 53 profiles /
52 predictions / 36 results / 18 messages / 11 forum posts (measured 2026-08-07 via Firestore
`runAggregationQuery`).

Explicitly excluded by the mandate: the pre-launch security tightening (`results` and
`tournamentState` are still open to any signed-in write; `/dev` still ships). Those are tracked
elsewhere and are not touched here.

---

## 1. The finding that reframes the whole exercise

**Cost is not the risk.** Blaze is live. Normal browsing at 250 users / 50 concurrent projects to
roughly **$5–10/month**. Even the worst read storm identified below (~2.8M reads to enter a full
season of results, pre-fix) is about **$1.70**. No part of this design is motivated by money.

The risks are **correctness** and **matchday responsiveness**. Two defects behave perfectly at 53
users and fail specifically at 250. That is the entire subject of this spec.

Note also that a **16-item scaling pass already happened on 2026-07-31** and its fixes are real
and holding: presence and typing moved to Realtime Database, likes denormalised onto the post doc,
chat/lobby-chat/forum windowed to 50 via `paginatedMessages.ts`, the leaderboard precomputed
server-side, lobby listeners properly torn down, a `sessionCache` layer added. Its punch-list doc
was never committed (`PROJECT_STATE.md` §396 notes the dangling "scaling-audit No. X" citations),
so this spec is also the durable record that pass never got.

### Completeness of the sweep

Every `getDocs`/`onSnapshot` in `src/` was classified. This matters because the mandate says "any
sort of request", so the claim being made is a complete one, not a sample:

| Shape | Queries | Verdict |
| --- | --- | --- |
| Windowed to `limit(50)` | chat, lobby chat, forum feed (`paginatedMessages.ts`) | Fine |
| Single document | `leaderboardCache/current`, `tournamentState`, `devConfig`, `profiles/{uid}` | Fine |
| Fixed small set | `results` (36), `devMatches` (144, dev-only) | Fine |
| Constrained query | `useMyLobbies` (`documentId() in ids`, `collectionGroup(members) where uid==me`), `useLobbyMembers`, `deleteLobby` | Fine |
| Capped by headcount (→250) | `usePlayers`, `usePredictionSubmitters`, `useSurveyResponses`, `useAllKnockoutPredictions` | §4 — wasteful, not dangerous |
| **Unbounded in time** | **`searchMessages.fetchAllMessagesForSearch`** | **§3 — the only one** |

Exactly one query in the app grows without limit. That is a good result for the prior audit, and
it makes §3 a one-line fix rather than an architectural problem.

---

## 2. Defect A — the leaderboard recompute storm and its lost-update race

### What exists today

`functions/leaderboard/index.js` recomputes the entire leaderboard on every write to
`predictions/{uid}` or `results/{teamId}`. Each invocation reads **all predictions + all profiles +
all results** — 536 documents at 250 participants — and `set()`s a single doc,
`leaderboardCache/current`.

Two independent problems follow.

**A1 — the storm.** `src/devpanel/useDevMatches.ts:64-69` commits one batch containing
`devMatches/{fixtureId}` plus **all 36 `results/{teamId}` docs**. Every changed doc fires its own
`onDocumentWritten`, so a single match outcome produces 5–15 concurrent full recomputes, each
re-reading 536 documents and all writing the same document.

The count is 5–15 rather than a flat 36 because Firestore **no-ops byte-identical writes without
firing the trigger** — established first-hand in this project on 2026-08-02, when forcing a
recompute required a genuine change-then-revert of `results/ajax.matchesPlayed`. Only teams whose
standings actually moved fire. Early matchdays shift many positions and sit near the top of that
range.

**A2 — the lost-update race.** This is the part that would be worth fixing at *any* scale. The
function reads, computes, then writes with no concurrency control, so two overlapping invocations
interleave:

```
A reads (sees 200 predictions)
        B reads (sees 201 — A's snapshot is already stale)
        B writes  → cache correct
A writes  → cache now reflects A's older read
```

**B's prediction is silently gone from the leaderboard, and nothing is scheduled to re-trigger.**
A recompute takes a few hundred milliseconds, so the collision window is real whenever two people
submit close together — which is exactly what deadline day at 250 participants looks like. The
participant sees a successful submission and no leaderboard entry.

### The fix, and why it is smaller than it looks

**A debounce fixes the race as a side effect.** A2 exists only because recomputes overlap. If a
burst of triggers collapses into a single recompute that runs alone against the latest state, there
is nothing to lose. So correctness does **not** require restructuring the stored data — which is
what makes the smallest available option also the safest.

Both triggers stop calling `recomputeLeaderboard()` and instead call a shared
`requestRecompute()`. State lives in a new control document, **`leaderboardCache/control`**, placed
in the existing collection deliberately so that **no `firestore.rules` change is required**: the
Admin SDK bypasses rules entirely, and `leaderboardCache/{docId}` is already `read: true,
write: false`, which is correct for a public timestamp nobody may forge.

Control doc fields:

| Field | Meaning |
| --- | --- |
| `requestToken` | Token of the most recent recompute request |
| `requestedAt` | When that request was made |
| `computedThroughRequestedAt` | The `requestedAt` the last successful compute covered |
| `computedAt` | When that compute landed |
| `lastComputeReadStartedAt` | The `readStartedAt` of the compute whose result is currently stored — the freshness stamp that makes writes monotonic (see below) |

`requestRecompute()`:

1. Generate a unique token; `set(control, { requestToken, requestedAt: Date.now() }, { merge: true })`.
2. Sleep `DEBOUNCE_MS` (2000), then re-read the control doc.
3. **If `requestToken` is no longer mine → return.** A newer request owns the work. *This is the
   step that collapses a 36-doc batch into one recompute.*
4. If it is mine, record `readStartedAt = Date.now()` and run the existing `recomputeLeaderboard()`
   body unchanged.
5. Commit inside a transaction that re-reads the control doc and **aborts without writing** if
   either guard trips:
   - **(a) `requestedAt > readStartedAt`** — inputs moved under me. The newer trigger is already
     sleeping and will produce a fresher result.
   - **(b) `lastComputeReadStartedAt > readStartedAt`** — a compute based on a *fresher read* has
     already landed, so mine is stale by definition and must not overwrite it.

   Otherwise write `leaderboardCache/current` and stamp `computedThroughRequestedAt`, `computedAt`
   and `lastComputeReadStartedAt = readStartedAt`.

Step 5 aborts rather than writing stale data. By induction the newest request always completes, so
aborting is safe as well as correct.

**Guard (b) is not redundant, and omitting it was a genuine bug in the first draft of this spec.**
Guard (a) plus the debounce only guarantees safety while the debounce provides mutual exclusion —
and the staleness ceiling below deliberately *breaks* that exclusion, since several triggers can
breach the ceiling at once and all proceed. Without (b), two such recomputes could both pass (a) and
the older read could land last, reintroducing exactly the A2 race this section exists to remove.
Guard (b) makes stored results **monotonic in read freshness**: an older read can never overwrite a
newer one, under any interleaving, ceiling path included. It is the load-bearing correctness
property of this design — the debounce is only an optimisation on top of it.

**Clock assumption, stated because it is an assumption:** `readStartedAt` comparisons use
`Date.now()` across potentially different Cloud Run instances. Same-region instances are NTP-synced
to well under a millisecond, which is immaterial against a 2000 ms debounce and a 30000 ms ceiling.
A server timestamp cannot substitute here, since `readStartedAt` must be captured *before* the reads
and Firestore only resolves `serverTimestamp()` at write time.

### Two safety properties

"The leaderboard is quietly wrong" is the worst failure this app can have — it is the entire point
of the site — so the debounce is not trusted on its own.

**A staleness ceiling.** Under *sustained* writes no trigger ever becomes "the latest" at step 3,
so the debounce would starve and the leaderboard would stop updating for as long as the load
lasted. Therefore: if `now - computedAt` exceeds `MAX_STALENESS_MS` (30000), a trigger proceeds
even without holding the newest token. Staleness is bounded under any load. Rarely exercised in
practice — a DevPanel batch is instantaneous and then quiet — but it converts an unbounded failure
into a bounded one for three lines.

**A scheduled safety net.** A scheduled function every 5 minutes recomputes **only** when
`requestedAt > computedThroughRequestedAt`. When idle that is one document read per run
(~288/day, negligible). It makes a dropped trigger, a crashed invocation, or any unforeseen
all-parties-aborted case **self-healing instead of permanently wrong**. Requires Cloud Scheduler
(3 free jobs, then $0.10/job/month).

### Result

| | Before | After |
| --- | --- | --- |
| Recomputes per match result | 5–15 concurrent | **1** |
| Reads per match result | 2,700–8,000 | **~536** |
| Reads to enter a 144-fixture season | ~0.4–1.2M | **~77k** |
| Concurrent writers on one doc | 5–15 | **1** |
| Lost-update race | **Present** | **Eliminated (serialised)** |
| Worst-case staleness | 0 | ~2s typical, 30s ceiling |

Also included, as a one-line and zero-risk addition: the profiles read becomes
`.select("firstName", "photoURL")`. Billed reads are unchanged (projection does not reduce document
count) and the saving is latency only, but it is free and it keeps surnames out of a function that
has no business reading them, consistent with the 2026-08-02 name-privacy split. It keeps reading
`profiles`, **not** `publicProfiles` — `profiles` is the source of truth, and depending on the
mirror here would let a missing `publicProfiles` doc silently drop a participant off the
leaderboard.

### Rejected alternatives

**Per-uid field-path writes** (`entries` array → map keyed by uid, so a prediction write touches
only `entries.{uid}`). Genuinely better on paper: ~38 reads per submission instead of 536, and the
race becomes *structurally* impossible rather than prevented by serialisation. Rejected for now
because it is a stored-shape migration requiring `useLeaderboard` to convert map→array, and its
advantage only pays off at a sustained submission rate that the debounce already flattens.
**Revisit if** real load ever shows recompute cost or submission latency mattering — the analysis
is here, ready.

**Per-user score docs** (`leaderboardScores/{uid}`, leaderboard paginated via `orderBy("points")`).
Zero contention, but every client returns to reading 250 documents to render the table — precisely
what scaling-audit No. 08/09 removed on 2026-07-31. Trades a solved problem for an unsolved one.

---

## 3. Defect B — chat search is the only unbounded query in the app

`src/chat/searchMessages.ts:26-31` issues `orderBy("createdAt","desc")` with **no `limit()`** — it
downloads the entire message collection so it can substring-match client-side, because Firestore
has no substring query. Its own comment justifies this as *"this app's whole history is small
enough (a friend-group season, not a public product)"*.

That assumption is exactly what 250 participants retires. Today it reads 18 documents. At 250
people across a September–May season, even a modest 150 messages/day is **~40,000 documents per
search click**, plus a multi-megabyte download parsed on the main thread — and it grows every day
of the season, and recurs on every search.

**Decision (Mert, 2026-08-07): cap it at recent history.** `limit(SEARCH_WINDOW)` with
`SEARCH_WINDOW = 2000`. Bounded forever, at a flat and predictable cost, with no new
infrastructure. `fetchAllMessagesForSearch` is renamed to stop claiming "all". Global chat and
lobby chat both benefit — it is one shared function.

Accepted trade-off, stated plainly because it is a real capability loss: **a message older than the
most recent 2000 is not findable.** This matches how the forum already behaves (`usePosts` searches
only what has been paged in).

One honesty affordance: when the window came back **full** *and* the search found **nothing**, the
existing empty state says the search covered recent messages rather than implying the message does
not exist. One line, appears rarely, no new chrome. Cut it if it reads as clutter — the golden rule
governs.

---

## 4. Waste removal — the three uncached headcount-sized fetches

`usePredictionSubmitters`, `useSurveyResponses` and `useAllKnockoutPredictions` are each a
full-collection fetch that grows to 250 documents, and each is the **only** data hook in the app not
wired into the existing `src/lib/sessionCache.ts` (which `usePlayers`, `useLeaderboard`,
`useResults`, `usePosts`, `useMessages` and `useProfile` all already use).

- `usePredictionSubmitters` — reads all 250 prediction docs, **each carrying a 36-element `ranking`
  array (~150 KiB)**, purely to extract their document IDs. It runs on `LoggedInHome`, the
  most-visited signed-in page, and it **gates first paint** (`submittersLoading` in that page's
  loading guard), so a cold visit waits on it.
- `useSurveyResponses` — 250 reads per Stats visit.
- `useAllKnockoutPredictions` — 250 reads per `TeamPopup` / `MatchupPopup` open, repeated on every
  re-open.

Wiring all three into `sessionCache` takes a repeat visit or a re-opened popup from 250 reads to
**zero**. No new mechanism, no new failure mode, and it is a perceived-speed win on `LoggedInHome`,
not only a cost one. A genuinely cold visit still pays 250 reads, which is acceptable — the
2026-07-31 pass considered this (No. 13) and judged it fine "up to the site's real target of ~500
participants", a judgement 250 sits comfortably inside.

**Deliberately not done:** deriving `submitterUids` from `leaderboardCache/current` (1 read instead
of 250). It would work — the cache already holds one entry per submitter — but it couples the
pre-tournament page to a leaderboard concept and makes correctness depend on two collections
agreeing. Not worth the subtlety for a cold-visit-only saving.

**Deliberately left alone:** `usePlayers`' full-collection live listener (250 docs, ~7 call sites,
3 mounting at once on mobile). It is the largest single per-session read cost, and it is correct,
already `sessionCache`-backed, and cheap. Firestore shares one watch target across identical
queries, so the concurrent mounts do not multiply server reads.

---

## 5. Verification

The project's own history is the argument for this section. `HANDOVER.md` records the same lesson
**four separate times**: the suite goes green while the thing is broken, because the failure is
render-timing or listener-timing that jsdom does not reproduce. A lost-update race and a trigger
storm are squarely in that category — a unit test asserting `recomputeLeaderboard()`'s contract
cannot observe two invocations interleaving.

**Decision (Mert, 2026-08-07): emulator for the race, production for the scale number.**

**Emulator — committed and repeatable.** An `emulators` block in `firebase.json` (Firestore +
Functions) and an integration suite kept **out of** the default `npm test`, since it requires the
emulator running. Two tests that fail against today's code and pass against the fix:

1. **The race.** Two concurrent `predictions/{uid}` writes → both entries must be present in
   `leaderboardCache/current`. Fails today.
2. **The storm.** One 36-doc `results` batch → exactly one recompute must occur. Asserted on
   `computedAt` moving once, not 5–15 times. Fails today.

Plus one test that does **not** need the emulator, and belongs in the normal suite: the step-5 guard
predicate is extracted as a **pure function** (`shouldCommitRecompute(control, readStartedAt)`) and
unit-tested directly against both guards — including the case guard (b) exists for, an older read
attempting to overwrite a newer stored compute. This follows the precedent of `selectNearbyWindow`
(2026-08-03), which was extracted from `NearbyStandingsList` for exactly this reason. It matters here
because the interleaving guard (b) protects against is the hardest thing in this design to provoke
on demand in an emulator, and a pure predicate can be tested exhaustively instead of hopefully.

**Production — once, with explicit go-ahead immediately beforehand.** Top production up to 250
predictions/profiles (`scripts/seed-dummy-participants.mjs` exists), then record from the real
function logs: recompute wall-clock latency, documents read per invocation, and invocations per
match result. Then remove the dummies. This is the number that actually answers the mandate;
emulator latency is indicative only.

`tsc -b` clean, `vite build` clean, and the full existing suite (956 tests / 126 files) green at
every checkpoint.

---

## 6. Out of scope

- **Hosting and CI.** There is **no hosting target configured anywhere** — `firebase.json` has no
  `hosting` key and there is no `.github/`, so there is currently no path from `npm run build` to a
  live URL (`PROJECT_STATE.md` §11/§13). `HashRouter` was chosen to keep static hosting easy. A
  site 250 people cannot reach obviously does not satisfy the mandate, but choosing and wiring a
  host is separate work from the request-path capacity this spec covers. **Flagged as the largest
  remaining launch blocker.**
- **Results automation.** `PROJECT_STATE.md` §7 lists it as skipped. The coalescing in §2 is
  deliberately writer-agnostic (Mert's explicit choice, 2026-08-07: assume both the DevPanel *and*
  hand-edits in the Firebase console are valid writers), so it keeps working underneath any future
  ingestion, and no hand-edit can silently leave the leaderboard stale.
- **Pre-launch security tightening.** Excluded by the mandate.
- **The 139 KiB leaderboard payload.** Measured, not fixed: 569 bytes/entry → ~139 KiB at 250
  entries, a safe 13.6% of the 1 MiB document limit, of which roughly two-thirds is the `ranking`
  arrays. `useLeaderboard` re-`JSON.stringify`s all of it into `localStorage` synchronously on the
  main thread on every snapshot. That is only a problem *because* snapshots arrive in storms;
  once §2 reduces them to one per match it is a single ~2–5 ms hitch, so splitting `ranking` out
  would be gold-plating. **Watch item:** if the entry count or the per-entry payload grows
  materially, revisit — the 1 MiB ceiling is a hard failure, not a slowdown.
- **Likes contention.** `postLikes.ts` correctly uses `arrayUnion`/`arrayRemove` transforms, so
  concurrent likers cannot clobber each other. Many likes on one post within a second would brush
  Firestore's ~1 write/s/document soft limit, but bursts are tolerated and 50 people liking the
  same post inside one second is not a real scenario. No action.

---

## 7. Incidental findings worth recording

- **`functions/stopbilling` IS deployed** — a Cloud Run service in `europe-west8` — despite not
  appearing in `gcloud functions list` or `firebase.json`. `PROJECT_STATE.md` §11 documents it as
  manually deployed and prone to silent reversion by the Cloud Run console, so its presence was
  worth re-confirming rather than assuming.
- **Deployed function configuration:** region `europe-west8`, `maxScale: 20`,
  `containerConcurrency: 80`, `timeoutSeconds: 60`. Capacity is ample; the debounce's 2s sleep is
  trivial against both the timeout and the free compute tier.
- **The Cloud Billing Budget API is not enabled** on the project, so no budget or alert could be
  verified from the CLI. Given `stopbilling` exists as a killswitch, confirming a budget actually
  backs it is worth doing before launch — flagged, not actioned, as it sits on the safety side of
  the mandate's line.

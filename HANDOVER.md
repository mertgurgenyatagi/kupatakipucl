# Handover: billing killswitch re-trip cycle — 2026-09-09

Fleeting doc, written to hand this specific problem to a fresh session —
delete once it's resolved and PROJECT.md reflects the outcome. No solution
is proposed here on purpose; this is a problem statement only.

## What's happening

`functions/stopbilling` (a Cloud Run service subscribed to a Pub/Sub
billing-alert topic) unlinks the project's billing account whenever
Google's own Cloud Billing reports month-to-date cost over the configured
budget — currently **$1**, Mert's deliberate choice. It fired **four times**
today, 2026-09-09:

1. **03:48 UTC** — first trip. Root cause: `functions/fixtures` used to
   `batch.set()` all 144 fixtures / 36 results on every poll regardless of
   whether anything changed, generating a write storm during the day's live
   matches. Fixed same-day by `docDiff.js` (write only what actually
   changed).
2. **11:49 UTC** — a re-link tripped again 2 minutes later.
3. **20:10 UTC** — tripped a third time, 6 minutes after a live sync
   succeeded. Root cause this time: the write-storm fix reduced the cost of
   a sync *doing real work*, but `functions/fixtures` still ran on a flat
   `onSchedule("every 2 minutes")` that fired 24/7 regardless of match
   activity — that recurring baseline, not live-match activity, was the
   actual cost driver. A Cloud Tasks-based rearchitecture was built to
   replace the flat schedule with precisely-timed per-kickoff wake-ups (see
   `functions/fixtures/README.md`'s "Live scheduling" section and
   PROJECT.md §6 for the full design) — deployed once billing came back.
4. **22:12 UTC** — tripped a fourth time, ~12 minutes after Mert re-linked
   billing to deploy the fix above. Confirmed in `stopbilling`'s own logs:
   `Cost 1.65 exceeded budget 1 — disabling billing`.

## The core problem, stated plainly

**Once a calendar month's cost has already exceeded the $1 budget, nothing
about re-linking billing changes that fact.** The Pub/Sub budget alert
`stopbilling` reacts to carries Google's own real, current month-to-date
total — not anything `stopbilling` itself remembers or could "reset." Every
re-link gets caught by the next budget notification (observed at roughly
15–40 minute intervals) and unlinked again, for as long as the month's
total stays over budget. This has now happened on trips #2 and #4.

This is separate from, and not fixed by, the Cloud Tasks rearchitecture —
that work reduces the *rate* of future cost accrual, it does nothing about
an already-exceeded month-to-date total.

**There is no other backstop.** Confirmed directly: a Cloud Billing budget
is a notification mechanism only. Google does not offer a native hard
spending cap for Cloud Functions/Cloud Run/Firestore. `stopbilling` is the
only thing in this project that turns a budget alert into an actual
enforcement action. If it's ever disabled, nothing stops spend from
accruing — only manual attention would.

## Current state, as of this writing

- **Billing: disabled.** Has been since 22:12 UTC (trip #4).
- **`functions/fixtures` redeployed** to the Cloud Tasks architecture
  (`planKickoffTasks`, `handleFixtureArrival`, `fixturesPollTick`,
  `resultsPollTick` — replacing the old two flat-scheduled functions, which
  were deleted). All four show `ACTIVE`. The three task-dispatched
  functions run in `europe-west6` (Zurich) — Cloud Tasks does not support
  `europe-west8` (Milan) at all, discovered at deploy time; `europe-west8`
  is used everywhere else in this app (matches Firestore's region).
- **Not verified against a real live tick.** The only manual trigger
  attempted (`planKickoffTasks`, twice) hit "no available instance" 429s —
  an old, previously-working function (`recomputeLeaderboardSafetyNet`)
  briefly hit the identical error around the same time, suggesting a
  transient project-wide Cloud Run capacity issue (plausibly from today's
  repeated billing/API enable-disable churn) rather than a bug in the new
  code — but this was never confirmed either way before billing tripped
  again and cut the investigation short.
- **Live scores are stale and will stay that way while billing is down.**
  Today's Sporting CP vs Galatasaray match (Matchday 1) did sync its final
  score (3–1, FINISHED) before the last disable, but no fixture kicking off
  from here on will get any update — nothing in the pipeline can execute at
  all without billing enabled, and since `planKickoffTasks` never got a
  successful run, no per-kickoff wake-up tasks have been scheduled for
  anything upcoming either.
- **Working tree is clean** — everything described above is committed and
  pushed to `main`. `PROJECT.md` §1 and §6 describe the incident and the
  Cloud Tasks design in full detail; this file is a pointer to "what's
  still actually unresolved," not a replacement for reading those.

## What was explicitly discussed and NOT decided

Raising the budget, and adding some kind of cooldown/override mechanism to
`stopbilling` itself so a deliberate work window doesn't immediately
re-trip — both came up in conversation. Neither was chosen, scoped, or
built. Start there with a clear head, not from this doc's framing.

# fixtures

Two scheduled Cloud Functions that sync the real UEFA Champions League
league-phase table and fixture calendar from
[football-data.org](https://www.football-data.org):

- **`syncFootballDataResults`** → `results/{teamId}`, replacing the dev
  panel's synthetic 1-0/0-0 scorelines as the production source of truth
  once the league phase starts (2026-09-08). Writes the exact same
  collection `src/devpanel/useDevMatches.ts` writes by hand, so
  `functions/leaderboard`'s existing `onDocumentWritten("results/{teamId}")`
  trigger picks up every sync automatically — no other wiring needed.
- **`syncFootballDataFixtures`** → `fixtures/{id}` — the full 144-match
  calendar (past and future), `id` being football-data.org's own match id.
  A brand new collection, unrelated to `src/devpanel/fixtures.ts`.

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

## Polling cadence — live-aware, added 2026-09-07

Both functions run on `onSchedule("every 2 minutes")`, but that schedule is
just the ceiling on how promptly a live window can be noticed — `pollGate.js`
decides, on every tick, whether to actually call football-data.org:

- **Live window**: any fixture that kicked off within the last 3.5 hours
  (2.5h estimated match length + 1h grace for late corrections) → poll.
- **Sparse**: otherwise, only if it's been ≥5 hours since the last real
  sync → poll. Everything in between is a no-op — one cheap Firestore query
  (`syncControl.js`'s `getRecentFixtures`, ≤20 docs) and nothing else.

This replaces the original flat 10-minute interval. football-data.org's Free
tier caps at 10 requests/**minute**, so even polling every 2 minutes
constantly would have been fine budget-wise — the point of gating isn't
protecting the API cap, it's making the live feature (src/leaderboard/
FixtureRow.tsx, MatchupPopup.tsx, the standings table) actually feel live
during a match without polling pointlessly for the other ~99% of the
season. `pollGate.test.js` covers the decision logic directly; `LIVE_WINDOW_MS`
and `SPARSE_INTERVAL_MS` are both named constants there if the numbers ever
need tuning.

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

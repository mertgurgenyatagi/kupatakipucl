# Design: Prediction Submission Flow (Round 1)

Status: Approved (chat), pending written-spec review.
Build unit: 2 of 7 in the section-by-section plan (see `SPEC.md` §9b).

## Overview

The first unit that actually writes user data: a one-time profile-completion step (bundled in here since nothing downstream has it yet), the one-time background survey, and the round-1 league-phase team ranking (survey → animation → drag-to-rank → submit), including editing before the deadline and a locked read-only view after. Round 2's knockout bracket is a different UI entirely and doesn't open until Feb 26, 2027 — it gets its own future unit.

## Goals

- Every logged-in user without a `profiles` doc is blocked behind a one-time "complete your profile" form (photo + first/last name) before they can use anything else in the app.
- A first-time predictor completes the one-time background survey, sees a brief transition, then drags the alphabetically-listed teams into a ranking and submits.
- An already-submitted user can reopen and edit their ranking (skipping the survey, which never repeats) up until Sept 8, 2026, with an explicit "are you sure you want to overwrite this?" confirmation before saving.
- Once the tournament has started, the predictions page shows their locked-in ranking read-only (or a "you didn't submit" notice if they never did).
- A live "X of Y have submitted" counter is visible on the predictions page.

## Non-Goals (explicitly deferred to later units)

- Round-2 knockout bracket submission UI.
- Visual/brand polish (`impeccable` pass) — stays a bare functional skeleton, same as unit 1; one deliberate design pass happens later across the whole site.
- Showing *other* participants' predictions/rankings publicly (leaderboard/stats unit).
- HomePage's real countdown/mission-blurb/team-table content — out of scope here, HomePage stays the unit-1 placeholder.
- Real club crest images — plain text team names for now (crests are a visual-polish concern, §9a).
- Confirming the real Aug 26, 2026 team list — dev placeholder data is used per `SPEC.md` §7's explicit shortcut.

## Architecture

- **New backend surfaces:** Firestore (profiles, survey responses, predictions) and Firebase Storage (profile photos) — this unit's first use of either; unit 1 only touched Firebase Auth.
- **Drag-and-rank:** `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` — chosen over native HTML5 drag-and-drop (poor touch/mobile support, which `SPEC.md` §5 explicitly requires) and over `react-beautiful-dnd` (unmaintained/deprecated).
- **Team data:** a static config module listing the real 2024–25 UCL league-phase 36 clubs (verified via Wikipedia), alphabetically ordered, each with a stable string ID. Swapped for the real confirmed list once known — isolated to one file so that swap is a one-line change, not a refactor.

## Data Model

- `profiles/{uid}`: `firstName: string`, `lastName: string`, `photoURL: string`, `createdAt: Timestamp`.
- `surveyResponses/{uid}`: `age: number`, `footballKnowledge: number` (1–7), `messiOrRonaldo: "messi" | "ronaldo" | "no-opinion"`, `superLigTeam: string`, `uclTeam: string | null`, `device: "phone" | "desktop" | "both"`, `submittedAt: Timestamp`. Written once; never edited again (matches `SPEC.md` §5's "one-time only" rule) — no update path exists for this doc at all, by design.
- `predictions/{uid}`: `ranking: string[]` (team IDs, ordered by predicted finish), `submittedAt: Timestamp`, `updatedAt: Timestamp`.

Doc ID = `uid` in all three collections (one profile, one survey response, one round-1 prediction per user — no need for a subcollection or a round discriminator yet, since round 2 is a separate future unit and, when built, can either reuse this doc shape with a `round` field or add a sibling collection; not decided now, not blocking this unit).

## Components & Flow

- **`ProfileGate`** — sits above routing (alongside `AuthProvider`, inside `App.tsx`). If `user` is logged in and no `profiles/{uid}` doc exists yet, renders the full-screen profile-completion form instead of the app (photo upload to Storage, first/last name to Firestore). Once saved, the gate opens and normal routing resumes. This is app-wide, not `PredictionsPage`-specific, since names/photos are needed elsewhere (player lists) too.
- **`PredictionsPage`** (replaces the current placeholder), branches on tournament phase:
  - **Pre-tournament (NST_LI), no existing prediction:** `SurveyForm` (one question at a time, progress bar) → brief transition screen → `TeamRanker` (drag-to-rank) → submit writes both `surveyResponses` and `predictions`.
  - **Pre-tournament (NST_LI), existing prediction:** shows current ranking + an "edit" action. Editing reopens `TeamRanker` pre-filled with the existing order (no survey replay) and shows an overwrite-confirm dialog before the save actually commits.
  - **Post-tournament (ST_LI):** read-only ranking display, or a "you didn't submit a prediction" message if no doc exists. No edit controls render at all in this phase.
- **`SubmissionCounter`** — small component on `PredictionsPage` showing "X of Y have submitted," backed by a Firestore count query over `predictions`.

## Data Flow

`AuthProvider` (existing) → `ProfileGate` checks/creates `profiles/{uid}` → once past the gate, `PredictionsPage` reads `surveyResponses/{uid}` and `predictions/{uid}` to decide which of the three branches above to render, and writes to Firestore/Storage on each step's submit action.

## Error Handling

- Photo upload failure (network, file too large) → inline error, form stays open, user can retry — no partial profile ever gets saved (name+photo committed together, not two separate writes that could diverge).
- Firestore write failure on survey/prediction submit → inline error, user's in-progress answers/ranking stay in local component state so nothing is lost, retry re-attempts the same write.
- Overwrite-confirm dialog is a real gate, not cosmetic: declining it discards the edit and returns to the read-only current-submission view unchanged.

## Testing Approach

Same pattern as unit 1: Vitest + React Testing Library, `firebase/firestore` and `firebase/storage` calls mocked at the module level (no emulator suite). Key cases: profile gate blocks/unblocks correctly, survey-then-rank flow on first submission, edit flow skips the survey and requires overwrite confirmation, read-only rendering post-tournament with and without an existing submission, submission counter reflects mocked counts.

## Setup Dependencies (needs Mert, not just Claude)

- None expected — reuses the existing `kupatakipucl` Firebase project from unit 1; enabling Firestore and Storage in that same project is a console click, not a new account/setup step. Will flag here if that turns out wrong once we're actually wiring it up.

## Follow-ups for Later Units

- Round-2 knockout bracket submission UI (own unit, built closer to Feb 2027).
- Real club crest images and full visual polish pass (`impeccable`, `SPEC.md` §9a) across the whole site at once.
- HomePage's real countdown/mission-blurb/team-table content.
- Swap in the real Aug 26, 2026 confirmed team list.

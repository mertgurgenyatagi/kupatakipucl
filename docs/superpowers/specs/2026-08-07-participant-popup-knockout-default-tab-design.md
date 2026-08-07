# ParticipantPopup: default to Eleme Tahmini in knockout/preknockout, per open

## Problem

`ParticipantPopup.tsx` shows two tabs for a participant's own predictions —
"Lig Tahmini" (league) and "Eleme Tahmini" (knockout) — but the initial tab
is hardcoded to `"league"` regardless of tournament phase. Once the
tournament is in `preknockout`/`knockout`, league predictions are the less
relevant of the two; the popup should open on the knockout bracket by
default.

`ProfilePage.tsx` already gets this right for a user's own predictions (its
`activePredictionTab` defaults to `"knockout"` when `state` is
`loggedin_preknockout`/`loggedin_knockout`) — that page is out of scope for
this change, already correct, and not touched.

No other widget/popup in the app shows a single participant's full
prediction set (league ranking or knockout bracket) — `TeamPopup` and
`MatchupPopup` show predictor *lists* across many participants for one
team/match, a different shape, out of scope here.

## Behavior change

In `ParticipantPopup.tsx`:

- `activePredictionTab` still starts as local component state (`"league"`
  by default), but a `useEffect` keyed on `ranked?.entry.uid` resets it to
  `"knockout"` (when `isKnockoutPhaseOrPre` is true) or `"league"`
  (otherwise) every time the popup is opened for a participant — including
  switching directly from one participant to another without closing the
  popup first.
- This is a deliberate behavior choice, confirmed with Mert: the popup
  stays mounted across different participants (it isn't remounted per
  click), so today a manual tab switch persists into the next participant
  opened. This change makes the phase-appropriate default win on every
  open instead, overriding whatever tab was left selected for the previous
  participant. A user can still manually switch tabs after opening; that
  choice just doesn't carry forward to the next participant.
- `isKnockoutPhaseOrPre` (`phase === "preknockout" || phase === "knockout"`)
  is already computed in this component (currently below the tab state
  declaration) — reused as-is, no change to that computation.

## Non-goals

- `ProfilePage.tsx` — already correct, not touched.
- `TeamPopup.tsx` / `MatchupPopup.tsx` — show multi-participant predictor
  lists, not a single user's full prediction set; not in scope.
- No change to what either tab renders, only which one is selected by
  default on open.

## Testing

Existing `ParticipantPopup.test.tsx` coverage should gain a case (or an
existing knockout-phase case should assert on it) confirming the popup
opens on the knockout tab when `phase` is `"preknockout"`/`"knockout"`, and
on the league tab otherwise — plus a case confirming the tab re-defaults
when the popup switches from one participant to another mid-session.

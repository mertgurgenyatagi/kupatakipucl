# ParticipantPopup Knockout-Phase Default Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In `ParticipantPopup`, default the predictions tab to "Eleme Tahmini" (knockout) instead of "Lig Tahmini" (league) whenever the tournament phase is `preknockout`/`knockout`, re-evaluated every time the popup opens for a participant — including switching directly from one participant to another without closing the popup first.

**Architecture:** `ParticipantPopup` already computes `isKnockoutPhaseOrPre` from its `phase` prop and holds `activePredictionTab` as local `useState`. Add one `useEffect`, keyed on the opening participant's uid (`ranked?.entry.uid`) and `isKnockoutPhaseOrPre`, that sets `activePredictionTab` to the phase-appropriate default whenever a participant is opened. No new props, no new components.

**Tech Stack:** React (function components + hooks), TypeScript, Vitest + Testing Library.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-07-participant-popup-knockout-default-tab-design.md`.
- Only `src/leaderboard/ParticipantPopup.tsx` and its test file change. `ProfilePage.tsx`, `TeamPopup.tsx`, `MatchupPopup.tsx` are explicitly out of scope and must not change.
- No change to what either tab renders — only which tab is selected by default on open.
- `tsc -b` must stay clean and the full test suite must stay green after this change.

---

### Task 1: Reset the prediction tab to the phase-appropriate default on every popup open

**Files:**
- Modify: `src/leaderboard/ParticipantPopup.tsx:252` (state declaration, unchanged) and `src/leaderboard/ParticipantPopup.tsx:276-280` (add the effect after `isKnockoutPhaseOrPre` is computed)
- Test: `src/leaderboard/ParticipantPopup.test.tsx`

**Interfaces:**
- Consumes: existing `ParticipantPopupProps.phase?: TournamentPhase` (already defined, `src/leaderboard/ParticipantPopup.tsx:78-80`) and existing `ParticipantPopupProps.ranked: RankedEntry | null` (`src/leaderboard/ParticipantPopup.tsx:44-45`, `RankedEntry` from `./ranking`, shape `{ entry: LeaderboardEntry; rank: number }`).
- Produces: no new exports. `activePredictionTab` remains component-local state, same type `"league" | "knockout"` as today.

- [ ] **Step 1: Write the failing tests**

Add this new `describe` block to the end of `src/leaderboard/ParticipantPopup.test.tsx`, just before the final closing `});` of the outer `describe("ParticipantPopup", ...)` block (i.e. as a sibling of the existing `describe("before the tournament starts", ...)` block):

```tsx
  describe("knockout-phase prediction tab default", () => {
    it("defaults to the Eleme Tahmini (knockout) tab when phase is knockout", async () => {
      render(
        <ParticipantPopup
          ranked={{ entry: baseEntry, rank: 3 }}
          entries={[baseEntry, otherEntry]}
          players={PLAYERS}
          results={results}
          onOpenChange={() => {}}
          onSelectTeam={() => {}}
          tournamentStarted={true}
          phase="knockout"
        />
      );
      // No knockout prediction doc exists for this uid (mockGetDoc defaults
      // to exists: () => false), so the knockout tab's own empty state is
      // the tell that the knockout tab, not the league grid, is active.
      expect(
        await screen.findByText("Bu katılımcı henüz eleme tahmini yapmamış.")
      ).toBeInTheDocument();
      expect(screen.queryByText(TEAMS[0].shortName)).not.toBeInTheDocument();
    });

    it("defaults to the Eleme Tahmini (knockout) tab when phase is preknockout", async () => {
      render(
        <ParticipantPopup
          ranked={{ entry: baseEntry, rank: 3 }}
          entries={[baseEntry, otherEntry]}
          players={PLAYERS}
          results={results}
          onOpenChange={() => {}}
          onSelectTeam={() => {}}
          tournamentStarted={true}
          phase="preknockout"
        />
      );
      expect(
        await screen.findByText("Bu katılımcı henüz eleme tahmini yapmamış.")
      ).toBeInTheDocument();
      expect(screen.queryByText(TEAMS[0].shortName)).not.toBeInTheDocument();
    });

    it("stays on the Lig Tahmini (league) tab when phase is leaguephase", async () => {
      render(
        <ParticipantPopup
          ranked={{ entry: baseEntry, rank: 3 }}
          entries={[baseEntry, otherEntry]}
          players={PLAYERS}
          results={results}
          onOpenChange={() => {}}
          onSelectTeam={() => {}}
          tournamentStarted={true}
          phase="leaguephase"
        />
      );
      // leaguephase isn't preknockout/knockout, so the popup renders the
      // classic compact view with no tabs at all — league predictions show
      // directly.
      expect(await screen.findByText(TEAMS[0].shortName)).toBeInTheDocument();
      expect(
        screen.queryByText("Bu katılımcı henüz eleme tahmini yapmamış.")
      ).not.toBeInTheDocument();
    });

    it("re-defaults to the knockout tab when switching to a different participant, even after a manual switch to league", async () => {
      const { rerender } = render(
        <ParticipantPopup
          ranked={{ entry: baseEntry, rank: 3 }}
          entries={[baseEntry, otherEntry]}
          players={PLAYERS}
          results={results}
          onOpenChange={() => {}}
          onSelectTeam={() => {}}
          tournamentStarted={true}
          phase="knockout"
        />
      );
      await screen.findByText("Bu katılımcı henüz eleme tahmini yapmamış.");

      fireEvent.click(screen.getByRole("button", { name: "Lig Tahmini" }));
      expect(await screen.findByText(TEAMS[0].shortName)).toBeInTheDocument();

      rerender(
        <ParticipantPopup
          ranked={{ entry: otherEntry, rank: 5 }}
          entries={[baseEntry, otherEntry]}
          players={PLAYERS}
          results={results}
          onOpenChange={() => {}}
          onSelectTeam={() => {}}
          tournamentStarted={true}
          phase="knockout"
        />
      );

      expect(
        await screen.findByText("Bu katılımcı henüz eleme tahmini yapmamış.")
      ).toBeInTheDocument();
      expect(screen.queryByText(TEAMS[2].shortName)).not.toBeInTheDocument();
    });
  });
```

This uses `TEAMS[2]` in the last assertion because `otherEntry.ranking` is `[TEAMS[2].id]` (see the existing `otherEntry` fixture near the top of the file) — if the league tab were wrongly still active after switching participants, `otherEntry`'s predicted team would render instead of the knockout empty-state message.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/leaderboard/ParticipantPopup.test.tsx`

Expected: the four new tests under `"knockout-phase prediction tab default"` FAIL. The first three fail because today's code always initializes `activePredictionTab` to `"league"` — for `phase="knockout"`/`"preknockout"` the league grid renders instead of the knockout empty-state text, so `findByText("Bu katılımcı henüz eleme tahmini yapmamış.")` times out. The fourth fails the same way, and additionally because nothing resets the tab when `ranked` changes to a new participant. All other, pre-existing tests in the file still PASS.

- [ ] **Step 3: Implement the fix**

In `src/leaderboard/ParticipantPopup.tsx`, find this existing line (around line 277):

```tsx
  const isMobile = useIsMobile();
  const isKnockoutPhaseOrPre = phase === "preknockout" || phase === "knockout";
  const { prediction: knockoutPrediction, loading: knockoutLoading } = useKnockoutPrediction(
    isKnockoutPhaseOrPre && tournamentStarted ? displayedUid : null
  );
```

Replace it with:

```tsx
  const isMobile = useIsMobile();
  const isKnockoutPhaseOrPre = phase === "preknockout" || phase === "knockout";

  // Reset to the phase-appropriate default every time a participant is
  // opened — including switching straight from one participant to another
  // without closing the popup first, since this component stays mounted
  // across different participants rather than remounting per click.
  useEffect(() => {
    if (ranked) {
      setActivePredictionTab(isKnockoutPhaseOrPre ? "knockout" : "league");
    }
  }, [ranked?.entry.uid, isKnockoutPhaseOrPre]);

  const { prediction: knockoutPrediction, loading: knockoutLoading } = useKnockoutPrediction(
    isKnockoutPhaseOrPre && tournamentStarted ? displayedUid : null
  );
```

No change is needed to the `activePredictionTab` state declaration itself (`src/leaderboard/ParticipantPopup.tsx:252`) — it keeps its `useState<"league" | "knockout">("league")` initializer; the new effect is what makes the default phase-aware and re-evaluated per open. `useEffect` is already imported in this file (`src/leaderboard/ParticipantPopup.tsx:1`).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/leaderboard/ParticipantPopup.test.tsx`

Expected: PASS — all tests in the file, including the four new ones.

- [ ] **Step 5: Run the full suite and typecheck**

Run: `npx tsc -b`
Expected: no errors.

Run: `npx vitest run`
Expected: full suite PASS, no regressions elsewhere (in particular `ProfilePage.test.tsx`, which is untouched by this change and should be unaffected).

- [ ] **Step 6: Commit**

```bash
git add src/leaderboard/ParticipantPopup.tsx src/leaderboard/ParticipantPopup.test.tsx
git commit -m "$(cat <<'EOF'
fix: default ParticipantPopup to knockout predictions in knockout phase

Eleme Tahmini is now the default tab whenever phase is preknockout or
knockout, re-evaluated on every open (including switching directly
between participants), instead of always starting on Lig Tahmini.
EOF
)"
```

---

## Self-Review Notes

- **Spec coverage:** the spec's single behavior change (phase-aware default, re-evaluated per open) is covered by Task 1's four tests: knockout default, preknockout default, league-phase unaffected (no tabs render at all), and re-default on participant switch overriding a manual tab choice. The spec's non-goals (`ProfilePage`, `TeamPopup`, `MatchupPopup`) are called out in Global Constraints as out of scope — no task touches them.
- **Placeholder scan:** no TBD/TODO; all test and implementation code is complete and copy-pasteable.
- **Type consistency:** `activePredictionTab` stays `"league" | "knockout"` throughout; `ranked?.entry.uid` matches `RankedEntry`'s existing shape (`{ entry: LeaderboardEntry; rank: number }`, `LeaderboardEntry.uid: string`) already used elsewhere in this same file (e.g. `displayed?.entry.uid` at line 264).

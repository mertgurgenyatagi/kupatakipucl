# Home — logged-in, league phase — design spec

**Status:** approved (Mert, 2026-08-03 — "Proceed")
**Branch:** `home-loggedin-leaguephase`

## Purpose

Build the `loggedin_leaguephase` composition of `HomePage.tsx` — one of the remaining "started" cells still rendering the generic `[Placeholder]` skeleton (status grid: Home is red for this login×phase combination). Source: a hand-drawn wireframe (nav → welcome banner, same as logged-in-not-started → 3-column bento: [upcoming 3 matches / forum widget] | hero carousel | [nearby standings / chat]), explicitly flagged by Mert as a rough layout sketch, not a literal visual spec.

## Scope note: what's in vs. out

**In scope:** exactly the `loggedin_leaguephase` `VisibilityState`. A new `HomeLandingLoggedInStarted` component + its data-fetching wrapper `LoggedInHomeStarted`, routed from `HomePage.tsx`, composing five widgets per the wireframe (welcome banner + 4 bento cells).

**Out of scope, explicitly:**
- `loggedin_preknockout`, `loggedin_knockout`, and `loggedout_preknockout`/`loggedout_knockout` — still the shared `[Placeholder]` skeleton after this ships. This is a separate future decision, not this branch's job.
- The "Katılımcılar" participant-list widget and the Special Lobby switcher/management UI — confirmed dropped from this page entirely, replaced by the upcoming-matches widget and the new nearby-standings widget respectively. This does not remove the Special Lobbies feature itself (still reachable via `HomeLandingLoggedIn`'s own Katılımcılar/Sohbet cells on the not-started page) — it's just absent from this one composition.
- Mobile/responsive layout — desktop-only, per Mert's explicit instruction ("do not even give an ounce of thought to mobile"), same precedent as every other bento-style page built so far.
- Any change to `HomeHero`, `UpcomingMatchesPreview`, `RecentPostsPreview`, `TeamPopup`, or `MatchupPopup`'s own behavior on pages that already use them — this branch only adds new small components alongside them and extracts one shared sub-piece (the welcome banner). It doesn't change how existing pages render.

## 1. Component architecture

| Wireframe cell | Component | Reuse / new |
|---|---|---|
| Welcome banner | `HomeWelcomeBanner` | New — extracted from `HomeLandingLoggedIn.tsx` |
| Col 1 top — upcoming 3 matches | `UpcomingMatchesPreview` | Reused as-is |
| Col 1 bottom — forum widget | `RecentPostsPreview` + `ForumPreviewFooter` | Reused as-is |
| Col 2 — hero carousel | `HomeHero` | Reused as-is |
| Col 3 top — nearby standings | `NearbyStandingsList` | New |
| Col 3 bottom — chat | `ChatRoom` | Reused as-is, global-only wiring |

### Why extract `HomeWelcomeBanner`

The wireframe calls for the banner to be identical to logged-in-not-started's (avatar, greeting, CTA, countdown). Duplicating that JSX would duplicate the CTA/countdown logic in two places that must always behave identically — instead, `HomeLandingLoggedIn.tsx`'s existing banner markup moves into `src/home/HomeWelcomeBanner.tsx`, taking `me: Player` and `showCta: boolean` (replacing the inline `!submitterUids.has(me.uid)` check, which the caller now computes and passes in). `HomeLandingLoggedIn` passes `showCta={!submitterUids.has(me.uid)}` (unchanged behavior); the new started page passes `showCta={false}` unconditionally.

**Why the CTA is always hidden on the started page:** `/predictions` is a one-time door that redirects home for anyone who visits once the tournament has started (`PredictionsPage`'s existing gate), regardless of submission status. Reusing the raw submission check here would show a "Tahminini Yap" button that leads nowhere useful for anyone who missed the deadline. The countdown itself needs no equivalent guard — `useCountdown` already renders nothing once `countdown.done` is true, which is always the case once the league phase has started.

### Why `NearbyStandingsList` is a new component, not a `LeaderboardTable` variant

`LeaderboardTable` carries full-page concerns (sticky header, tall scroll container, hover-driven team-table highlighting) that don't apply to a fixed 5-row snapshot. Retrofitting a "windowed" mode onto it would mostly be an `if` around two unrelated render trees. A small dedicated component, in the same spirit as `ParticipantStatusList`, keeps both components single-purpose.

## 2. New component specs

### `HomeWelcomeBanner`

- Exact markup/behavior currently inline in `HomeLandingLoggedIn.tsx` (avatar, "Hoş geldin, {firstName}." greeting, `MiniCountdownDigit`-based countdown row), unchanged pixel-for-pixel.
- Props: `me: Player`, `showCta: boolean`. When `showCta` is true, renders the existing "Tahminini Yap" link exactly as today; when false, that link is omitted entirely (the countdown row is unaffected and still self-hides via `countdown.done`).

### `NearbyStandingsList`

- Props: `entries: LeaderboardEntry[]`, `players: Player[]`, `myUid: string`, `onSelectParticipant: (uid: string) => void`.
- Ranks `entries` via the existing `assignRanks()` helper (same one `LeaderboardTable`/`HomeLandingLoggedOutStarted` already use) to get one ordered array — ties keep standard competition ranking (shared rank numbers), exactly as everywhere else in the app.
- Finds the viewer's index in that ordered array and takes a 5-entry window centered on it, **sliding** rather than padding at either edge: rank 1 shows ranks 1–5, last place shows the bottom 5, and everyone else genuinely sees 2 rows above and 2 below themselves.
- If the viewer has no entry at all (never submitted a prediction, so no score exists), falls back to showing the top 5 overall.
- If there are fewer than 5 entries total, shows all of them.
- If there are zero entries at all, renders the same "Henüz tahmin gönderen olmadı." empty state `LeaderboardTable` already uses, for consistency.
- Row content: avatar, rank number, name (via the existing `fullName()`/`initials()` helpers, which already degrade gracefully for a missing `lastName`), points — one row per entry, sized/spaced like `ParticipantStatusList`'s rows.
- The viewer's own row gets a visual highlight (subtle background/border tint using an existing token, e.g. `color_accent` at low opacity) so they can immediately spot themselves in the window.
- Row click fires `onSelectParticipant(uid)` — wired to open `ParticipantPopup`, the same behavior the dropped Katılımcılar list had. Pointer cursor on rows (Cursorify).

## 3. `HomeLandingLoggedInStarted` — page composition

New file, `src/home/HomeLandingLoggedInStarted.tsx`, named to match the existing `HomeLandingLoggedOutStarted`/`HomeLandingLoggedIn` family. Routed from `HomePage.tsx` with a new early return:

```ts
if (state === "loggedin_leaguephase") {
  return <LoggedInHomeStarted results={results} players={players} entries={entries} />;
}
```

placed alongside the three existing dedicated early returns (`loggedout_notstarted`, `loggedin_notstarted`, `loggedout_leaguephase`), ahead of the generic shared-skeleton fallback (which keeps handling the remaining unbuilt started states).

**Layout:** `HomeWelcomeBanner` full-width on its own row (unchanged `PAGE_SHELL` shell), then one CSS grid row below it, three columns: col 1 and col 3 similar width, col 2 a fixed 300px matching `HomeHero`'s established width elsewhere — starting values, not pixel-locked, per Mert's own "shitty illustration, don't take it too seriously" framing. Col 1 and col 3 are each a flex column of two `Frame`s stacked vertically, with the top frame in each fixed at the same height (`h-60`, matching `HomeLandingLoggedOutStarted`'s precedent for its upcoming-matches cell) and the bottom frame filling the remaining space.

**No `FrameHeader`/title band on any of the five widgets** — confirmed with Mert directly, a deliberate departure from `HomeLandingLoggedIn`'s navy-banded cells. Two consequences:
- The forum cell keeps its `ForumPreviewFooter` (a footer link, not a header) as its only "see more" affordance.
- The chat cell has no header band to hold the online-count badge that `HomeLandingLoggedIn`'s Sohbet cell shows today. Since the Special Lobby switcher/settings gear are dropped entirely here (not just hidden), the only thing that needs a new home is the online count — rendered as a small, quiet `● N çevrimiçi` line directly inside the `FrameBody`, above the chat transcript, styled as plain muted text rather than a navy banner.

**Chat is global-only:** `ChatRoom` receives the global `messages`/`typingUids`, `mentionCandidates={players}`, and `lobbyId={null}` — no lobby-switching state, no `LobbySwitcher`, no `LobbyManagementPanel` anywhere in this composition.

**Popups:** `ParticipantPopup`, `TeamPopup`, and `MatchupPopup` mounted once each at the composition's root, wired with mutually-exclusive selected-id state exactly like `HomeLandingLoggedOutStarted` (`handleSelectTeam`/`handleSelectParticipant`/`handleSelectFixture`, each clearing the other two). `tournamentStarted={true}` unconditionally; `ParticipantPopup` gets `viewerLoggedIn={true}` (this composition only ever has a real signed-in viewer); `MatchupPopup` gets `phase="leaguephase"` hardcoded, matching `HomeLandingLoggedOutStarted`'s existing precedent.

## 4. Data wiring

**`LoggedInHomeStarted.tsx`** (new data-fetching wrapper, mirrors `LoggedInHome.tsx`'s role for the not-started page): fetches `useAuth`, `useProfile`, `useMessages` (global chat only), `usePresenceHeartbeat`/`useOnlineCount`, `useTypingUsers`, and `usePosts()` + like/delete/edit handlers (same pattern `LoggedInHome.tsx` already has for all of these). It does **not** fetch `usePredictionSubmitters`, `useMyLobbies`, `useLobbyMembers`, `useLobbyMessages`, or any lobby-creation state — none of that applies since Katılımcılar and lobby-switching are absent from this page.

`results`/`players`/`entries` arrive as props from `HomePage.tsx` (already fetched there via `useResults`/`usePlayers`/`useLeaderboard`, public reads, same pattern `HomeLandingLoggedOutStarted` already follows) — passed through `LoggedInHomeStarted` to `HomeLandingLoggedInStarted` alongside everything it fetches itself.

## 5. Testing

- New `HomeWelcomeBanner.test.tsx`: renders greeting for a given `me`; CTA present when `showCta` true, absent when false; countdown still self-hides once done.
- `HomeLandingLoggedIn.test.tsx`: unaffected in behavior, updated only to the extent its banner assertions now exercise the extracted component.
- New `NearbyStandingsList.test.tsx`: covers the sliding-window logic directly — viewer in the middle (2 above/2 below), viewer at rank 1 or 2 (shows ranks 1–5), viewer at the bottom (shows bottom 5), fewer than 5 total entries (shows all), viewer not present in `entries` (falls back to top 5), zero entries (empty-state message), row click fires `onSelectParticipant`.
- New `HomeLandingLoggedInStarted.test.tsx`: all five widgets render with no header bands; welcome banner never shows the CTA regardless of submission status; selecting a team/participant/fixture opens the right popup; chat renders with no lobby-switcher UI; nothing throws when `results`/`entries` are empty.
- New `LoggedInHomeStarted.test.tsx`: mirrors `LoggedInHome.test.tsx`'s existing coverage for the hooks it shares (auth/profile/messages/posts loading states), minus anything lobby- or submitter-related.
- `HomePage.test.tsx` (or wherever the state-routing switch is tested): extend to assert `loggedin_leaguephase` renders `LoggedInHomeStarted` instead of falling through to the shared placeholder skeleton, and that the remaining unbuilt started states are unaffected.
- Manual/Playwright verification: dev server, DevPanel forced into `loggedin_leaguephase` with a genuinely signed-in session (per the documented DevPanel auth requirement), confirm all five widgets render with real data, the welcome banner never shows a CTA, a nearby-standings row click opens `ParticipantPopup`, chat sends/receives with no lobby UI visible.

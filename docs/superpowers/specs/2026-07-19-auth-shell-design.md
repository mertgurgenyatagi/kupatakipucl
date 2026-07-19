# Design: Auth + Four-State Shell

Status: Approved (chat), pending written-spec review.
Build unit: 1 of 7 in the section-by-section plan (see `SPEC.md` §9b).

## Overview

The foundational shell every other unit will be built inside of: Google sign-in, and routing/gating across the four visibility states defined in `SPEC.md` §8 (NST-NLI, NST-LI, ST-NLI, ST-LI — tournament not-started/started × logged-out/logged-in). This unit ships the skeleton only: real sign-up form fields, real Turkish copy, and all actual feature content (predictions, leaderboard, chat, forum, stats) are explicitly out of scope and land in later units.

## Goals

- A user can sign in and out with Google.
- The app correctly determines which of the four states applies and renders the right placeholder for it.
- Nav/routes for the five future sections (`/predictions`, `/leaderboard`, `/chat`, `/forum`, `/stats`) exist and are gated by the same state matrix future units will reuse — no re-deriving visibility logic later.
- Works correctly as a static build (no server), and specifically survives a hard refresh on a deep link.

## Non-Goals (explicitly deferred to later units)

- The actual sign-up form (photo/first name/last name capture).
- Final Turkish copy/mission blurb text — placeholder labels only.
- Any Firestore/Storage usage — this unit only touches Firebase Auth.
- Any real content inside `/predictions`, `/leaderboard`, `/chat`, `/forum`, `/stats` — empty labeled placeholders only.
- Visual/brand polish (`impeccable` pass) — comes once there's a full page to polish, not a bare skeleton.

## Architecture

- **Stack:** Vite + React + TypeScript, per approved Option A (see chat history 2026-07-19).
- **Backend for this unit:** Firebase Auth only (Google provider). Reuses Mert's existing Firebase account; a new project is created for this app.
- **Hosting for this unit:** local dev server (`npm run dev`) during development. No GitHub Pages publish pipeline is being set up yet — `SPEC.md` §7a already establishes the eventual home is a subfolder of `mertgurgenyatagi.github.io`, and migration happens late/deliberately, so we don't build a deploy pipeline for a repo we know is temporary.
- **Routing:** React Router's `HashRouter`. Chosen over `BrowserRouter` for two reasons specific to this project: (1) GitHub Pages has no server-side rewrite, so a hard refresh on a deep `BrowserRouter` link 404s without extra tooling; (2) the eventual subpath deployment (`/kupatakipucl/`) adds `base`-path complexity that hash routing sidesteps entirely. Cosmetic cost: URLs contain a `#` (e.g. `/#/chat`) — acceptable for a link shared directly with a friend group, not something discoverable via search.

## State Model

Two independent booleans, computed client-side, no backend query for either:

- `isLoggedIn` — from Firebase's `onAuthStateChanged` listener, exposed via a React context (`AuthProvider`).
- `tournamentStarted` — a pure date comparison against Sept 8, 2026 00:00 Europe/Istanbul (`SPEC.md` §2), computed via a small `useTournamentPhase` hook. Recomputed on mount and on window focus; does not need a live ticking subscription in this unit (that arrives with the countdown UI in a later unit, per `SPEC.md` §8a).

The Cartesian product of these two booleans is the single source of truth for which of the four `SPEC.md` §8 states is active — one shared config/lookup, not four separately-coded branches scattered across components.

## Components

- `AuthProvider` — wraps the app; exposes `{ user, loading }` via context; owns the `onAuthStateChanged` subscription.
- `LoginButton` / `LogoutButton` — trigger `signInWithPopup(GoogleAuthProvider)` / `signOut()`.
- `AppShell` — header (site name + login/logout control) + router outlet.
- `HomePage` — renders the placeholder block matching the active one of the four states.
- `PredictionsPage`, `LeaderboardPage`, `ChatPage`, `ForumPage`, `StatsPage` — empty labeled placeholders (e.g. "Leaderboard — coming soon"), each wrapped in the same state-gating so nav visibility already matches `SPEC.md` §8's per-state rules (e.g. chat absent when logged out).

## Data Flow

Firebase Auth state → `AuthProvider` context → consumed by route guards and nav rendering. Tournament-phase hook → same consumption pattern. No writes to any datastore in this unit; Firestore/Storage are introduced in the units that actually need them (predictions, chat, forum).

## Error Handling

- Sign-in popup closed or blocked by the browser → inline "sign-in didn't go through, try again" message, not a crash or silent failure.
- Network unavailable during sign-in attempt → generic retry message.
- No other failure surfaces meaningfully in a unit with no data writes.

## Testing Approach

Manual verification (no CI/test framework set up for this solo project): a dev-only date override (URL param, stripped from any eventual production build) lets us preview all four states locally without waiting for the real Sept 8, 2026 date. Login/logout gets tested live against Mert's real Google account. Each of the four states gets visually confirmed against `SPEC.md` §8's description before moving to the next unit.

## Setup Dependencies (needs Mert, not just Claude)

- Creating the Firebase project requires an interactive `firebase login` (Google OAuth in a real browser) — walked through together, not something Claude can do headlessly.
- Enabling the Google sign-in provider in the Firebase console.
- Firebase's web config (`apiKey` etc.) is not a secret by design — safe to check in — but will be kept in a gitignored `.env.local` via Vite env vars anyway, for cleanliness and so it's easy to swap if a separate dev/prod project is ever wanted.

## Follow-ups for Later Units

- Real sign-up form, Firestore schema for user profiles.
- Live ticking countdown (replaces the simple on-mount/on-focus phase check).
- GitHub Pages publish pipeline — only once this repo is closer to its eventual migration.

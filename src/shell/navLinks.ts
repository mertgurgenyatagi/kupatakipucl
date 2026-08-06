import { VisibilityState } from "../state/visibilityState";

export interface NavLink {
  path: string;
  label: string;
}

// No nav distinction yet between league phase / pre-knockout / knockout —
// all three started phases share the same link set per login state.
// Hakkında (About) is static content, ungated in every VisibilityState —
// same precedent as Ana Sayfa, appended last in every link set below.
const NOTSTARTED_LOGGEDOUT_LINKS: NavLink[] = [
  { path: "/", label: "Ana Sayfa" },
  { path: "/about", label: "Hakkında" },
];
const NOTSTARTED_LOGGEDIN_LINKS: NavLink[] = [
  { path: "/", label: "Ana Sayfa" },
  { path: "/forum", label: "Forum" },
  { path: "/about", label: "Hakkında" },
];
// Forum re-added for logged-out visitors 2026-08-02, reversing the earlier
// round-1 pagemap closure — see src/state/pageAccess.ts's matching comment.
// Leaderboard is signed-in-only (participant standings shouldn't be
// browsable, let alone linked from the nav, without an account).
const STARTED_LOGGEDOUT_LINKS: NavLink[] = [
  { path: "/", label: "Ana Sayfa" },
  { path: "/forum", label: "Forum" },
  { path: "/about", label: "Hakkında" },
];
const STARTED_LOGGEDIN_LINKS: NavLink[] = [
  { path: "/", label: "Ana Sayfa" },
  { path: "/leaderboard", label: "Puan Durumu" },
  { path: "/forum", label: "Forum" },
  { path: "/stats", label: "İstatistikler" },
  { path: "/about", label: "Hakkında" },
];

/**
 * The nav link set per VisibilityState — the single table both shells read.
 *
 * Extracted out of AppShell when the mobile shell arrived, specifically so
 * the two can't drift: `AppShell.test.tsx` asserts this table matches
 * `pageAccess.ts` exactly, and that invariant is only worth anything if the
 * mobile nav drawer is reading the same object rather than its own copy.
 */
export const NAV_LINKS: Record<VisibilityState, NavLink[]> = {
  loggedout_notstarted: NOTSTARTED_LOGGEDOUT_LINKS,
  loggedin_notstarted: NOTSTARTED_LOGGEDIN_LINKS,
  loggedout_leaguephase: STARTED_LOGGEDOUT_LINKS,
  loggedin_leaguephase: STARTED_LOGGEDIN_LINKS,
  loggedout_preknockout: STARTED_LOGGEDOUT_LINKS,
  loggedin_preknockout: STARTED_LOGGEDIN_LINKS,
  loggedout_knockout: STARTED_LOGGEDOUT_LINKS,
  loggedin_knockout: STARTED_LOGGEDIN_LINKS,
};

// src/pages/StatsPage.tsx
//
// Cleared 2026-09-07: Mert shelved the stats redesign to focus on the league
// phase launch. The old page (team bias, team agreement, survey
// distributions, and three widgets of fabricated football data — see
// PROJECT.md §11 #19/#20) is gone outright, not preserved — unlike TeamPopup
// (see TeamPopup.tsx's header comment), there was nothing here worth keeping.
// Still reachable at /stats by direct URL; just not linked from the nav
// (src/shell/navLinks.ts) and shows the same placeholder regardless of
// VisibilityState.
import { PageUnavailable } from "@/components/ui/page-unavailable";

export function StatsPage() {
  return <PageUnavailable />;
}

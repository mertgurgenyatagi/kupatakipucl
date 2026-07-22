import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import { getUpcomingFixtures } from "./upcomingFixtures";
import { resolveNow } from "../tournament/now";
import { TEAM_BY_ID } from "../predictions/teams";
import { TeamResult } from "./teamResultTypes";
import { TeamCrest } from "./TeamCrest";

const INITIAL_COUNT = 10;
const BATCH_SIZE = 10;
const LOAD_DELAY_MS = 550;
const SCROLL_THRESHOLD_PX = 32;
const PANEL_ID = "upcoming-matches-panel";

const DATE_FMT = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "short",
  timeZone: "Europe/Istanbul",
});
const TIME_FMT = new Intl.DateTimeFormat("tr-TR", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Europe/Istanbul",
});

// Home place · home crest-over-code | date/time | away crest-over-code ·
// away place. Code sits *under* its crest (Mert: "write the team codes
// under the badge rather than to the side") rather than beside it — which
// also happens to fix an earlier bug: with crest and code side by side as
// separate grid tracks, the fixed-width tracks (two crests + a wide date/
// time column) left the flexible name tracks *negative* room in this
// column's real 300px width (the page grid's fixed hero-column width, see
// LeaderboardPage's MAIN_ROW), so they silently collapsed to 0 — text
// present in the DOM, invisible on screen. Stacking removes a whole pair of
// horizontal tracks, so there's real room left over for date/time (Mert:
// "give more space to date and time").
const ROW_GRID_COLUMNS = "1.25rem minmax(0,1fr) 5rem minmax(0,1fr) 1.25rem";

function place(results: Record<string, TeamResult>, teamId: string): string {
  const position = results[teamId]?.position;
  return position ? String(position) : "-";
}

/** Clickable, but intentionally does nothing yet — Mert's own spec: "clickable
 *  but does nothing." Reserved for a future match-detail view. */
function handleMatchClick() {}

/**
 * The hero carousel's bottom drawer. Collapsed, it's a full-width bar peeking
 * up from the card's bottom edge with just a chevron. Open, it grows upward
 * to 90% of the card's height (Mert: "go up all the way until only the 10
 * percent headspace is left") — a fixed percentage of the card, not a
 * content-measured height, which is why this is hand-rolled with a plain
 * `open` boolean + CSS height transition rather than a Collapsible
 * primitive (those animate to *content* height, not an arbitrary
 * percentage of an ancestor).
 *
 * Shows real upcoming fixtures (kickoff still ahead of `now`, see
 * upcomingFixtures.ts) — not devMatches state, so this works identically for
 * a logged-out visitor in production, not just inside the dev panel. Ten are
 * loaded up front, however many tall rows fit in the 90%-height panel show
 * without scrolling, and scrolling to the bottom loads ten more at a time,
 * "Classic" infinite-scroll style, with a brief spinner standing in for a
 * fetch even though the full season's fixture list is already local.
 */
export function UpcomingMatchesDrawer({
  results,
}: {
  results: Record<string, TeamResult>;
}) {
  const allUpcoming = useMemo(() => getUpcomingFixtures(resolveNow()), []);
  const [open, setOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (loadTimer.current) clearTimeout(loadTimer.current);
    };
  }, []);

  const hasMore = visibleCount < allUpcoming.length;
  const shown = allUpcoming.slice(0, visibleCount);

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    if (loadingMore || !hasMore) return;
    const el = e.currentTarget;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom > SCROLL_THRESHOLD_PX) return;

    setLoadingMore(true);
    loadTimer.current = setTimeout(() => {
      setVisibleCount((c) => Math.min(c + BATCH_SIZE, allUpcoming.length));
      setLoadingMore(false);
    }, LOAD_DELAY_MS);
  }

  if (allUpcoming.length === 0) return null;

  return (
    <div
      className={`absolute inset-x-0 bottom-0 z-10 flex flex-col overflow-hidden transition-[height] duration-300 ease-[var(--ease-cotton)] ${open ? "h-[90%]" : "h-12"}`}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={PANEL_ID}
        aria-label={open ? "Yaklaşan maçları kapat" : "Yaklaşan maçları göster"}
        onClick={() => setOpen((o) => !o)}
        className="flex h-12 w-full shrink-0 cursor-pointer items-center justify-center rounded-t-[var(--radius-4xl)] border-t border-border/70 bg-card text-muted-foreground shadow-frame transition-colors duration-300 ease-[var(--ease-cotton)] hover:text-ink"
      >
        {open ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
      </button>

      <div
        id={PANEL_ID}
        className="flex min-h-0 flex-1 flex-col bg-card"
      >
        <div className="border-t border-border/70 px-4 pt-2">
          <span className="font-mono text-[0.58rem] tracking-[0.22em] text-muted-foreground uppercase">
            Yaklaşan Maçlar
          </span>
        </div>

        <div
          onScroll={handleScroll}
          className="no-scrollbar min-h-0 flex-1 overflow-y-auto"
        >
          {shown.map((fixture) => {
            const home = TEAM_BY_ID[fixture.homeTeamId];
            const away = TEAM_BY_ID[fixture.awayTeamId];
            const kickoff = new Date(fixture.kickoffUtc);
            return (
              <div key={fixture.id} className="h-24 px-2">
                <button
                  type="button"
                  onClick={handleMatchClick}
                  className="grid h-full w-full cursor-pointer items-center gap-1.5 rounded-lg px-2 transition-colors duration-300 ease-[var(--ease-cotton)] hover:bg-accent"
                  style={{ gridTemplateColumns: ROW_GRID_COLUMNS }}
                >
                  <span className="font-mono text-xs text-muted-foreground tnum">
                    {place(results, home.id)}
                  </span>
                  <span className="flex flex-col items-center gap-1">
                    <TeamCrest teamId={home.id} className="size-7" />
                    <span className="truncate font-display text-sm font-medium text-ink">
                      {home.shortName}
                    </span>
                  </span>

                  <span className="flex flex-col items-center justify-center leading-tight">
                    <span className="font-mono text-sm text-ink tnum">
                      {DATE_FMT.format(kickoff)}
                    </span>
                    <span className="font-mono text-sm text-muted-foreground tnum">
                      {TIME_FMT.format(kickoff)}
                    </span>
                  </span>

                  <span className="flex flex-col items-center gap-1">
                    <TeamCrest teamId={away.id} className="size-7" />
                    <span className="truncate font-display text-sm font-medium text-ink">
                      {away.shortName}
                    </span>
                  </span>
                  <span className="font-mono text-xs text-muted-foreground tnum">
                    {place(results, away.id)}
                  </span>
                </button>
              </div>
            );
          })}

          {loadingMore && (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

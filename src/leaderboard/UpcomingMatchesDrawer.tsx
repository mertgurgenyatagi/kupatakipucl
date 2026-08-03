import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type UIEvent,
} from "react";
import { ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import { getUpcomingFixtures } from "./upcomingFixtures";
import { resolveNow } from "../tournament/now";
import { TeamResult } from "./teamResultTypes";
import { FixtureRow } from "./FixtureRow";

const INITIAL_COUNT = 10;
const BATCH_SIZE = 10;
const LOAD_DELAY_MS = 550;
const SCROLL_THRESHOLD_PX = 32;
const PANEL_ID = "upcoming-matches-panel";

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
 *
 * Per-fixture rendering lives in FixtureRow.tsx (shared with Home's static
 * UpcomingMatchesPreview, 2026-08-02) — this component owns only the
 * collapse/expand chrome and the infinite-scroll batching.
 */
export function UpcomingMatchesDrawer({
  results,
  onSelectFixture,
  maxHeightClass = "h-[90%]",
}: {
  results: Record<string, TeamResult>;
  onSelectFixture?: (fixtureId: string) => void;
  maxHeightClass?: string;
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

  function handleScroll(e: UIEvent<HTMLDivElement>) {
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
      className={`absolute inset-x-0 bottom-0 z-10 flex flex-col overflow-hidden transition-[height] duration-300 ease-[var(--ease-cotton)] ${open ? maxHeightClass : "h-12"}`}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={PANEL_ID}
        aria-label={open ? "Yaklaşan maçları kapat" : "Yaklaşan maçları göster"}
        onClick={() => setOpen((o) => !o)}
        className="flex h-12 w-full shrink-0 cursor-pointer items-center justify-center rounded-t-[var(--radius-4xl)] border-t border-color_border1/70 bg-card text-color_textsecondary shadow-frame transition-colors duration-150 ease-[var(--ease-cotton)] hover:text-color_text"
      >
        {open ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
      </button>

      <div
        id={PANEL_ID}
        className="flex min-h-0 flex-1 flex-col bg-card"
      >
        <div
          onScroll={handleScroll}
          className="no-scrollbar min-h-0 flex-1 overflow-y-auto border-t border-color_border1/70 pt-2"
        >
          {shown.map((fixture) => (
            <FixtureRow key={fixture.id} fixture={fixture} results={results} onSelectFixture={onSelectFixture} />
          ))}

          {loadingMore && (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="size-4 animate-spin text-color_textsecondary" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

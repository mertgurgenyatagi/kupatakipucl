import { useMemo, useState, type UIEvent } from "react";
import { Loader2 } from "lucide-react";
import { LeaderboardEntry } from "./leaderboardTypes";
import { Player } from "../profile/usePlayers";
import { buildPlayersByUid } from "../profile/playersByUid";
import { fullName, initials } from "../profile/deletedAccount";
import { assignRanks, RankedEntry } from "./ranking";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface NearbyStandingsListProps {
  entries: LeaderboardEntry[];
  players: Player[];
  myUid: string;
  onSelectParticipant: (uid: string) => void;
}

const WINDOW_SIZE = 5;

/**
 * Pure windowing logic, exported for direct unit testing without rendering.
 * Slides rather than pads at either edge: a `centerIndex` too close to 0 or
 * to `items.length` clamps the window's start so it's always exactly
 * `windowSize` real items (when there are at least that many). A
 * `centerIndex` of -1 (viewer not found in the list at all) falls through
 * the same clamp to the top of the list — no separate case needed.
 */
export function selectNearbyWindow<T>(items: T[], centerIndex: number, windowSize = WINDOW_SIZE): T[] {
  if (items.length <= windowSize) return items;
  const half = Math.floor(windowSize / 2);
  let start = centerIndex - half;
  if (start < 0) start = 0;
  if (start + windowSize > items.length) start = items.length - windowSize;
  return items.slice(start, start + windowSize);
}

/**
 * Home's league-phase "standings around me" widget — prominent 5+ row view
 * with scroll-activated bidirectional 10-item loading and visual fade out.
 */
export function NearbyStandingsList({ entries, players, myUid, onSelectParticipant }: NearbyStandingsListProps) {
  const playersByUid = useMemo(() => buildPlayersByUid(players), [players]);
  const ranked = useMemo(() => assignRanks(entries), [entries]);
  const myIndex = useMemo(() => {
    const idx = ranked.findIndex((r) => r.entry.uid === myUid);
    return idx >= 0 ? idx : 0;
  }, [ranked, myUid]);

  const [extraAbove, setExtraAbove] = useState(0);
  const [extraBelow, setExtraBelow] = useState(0);
  const [loadingAbove, setLoadingAbove] = useState(false);
  const [loadingBelow, setLoadingBelow] = useState(false);

  const visibleWindow = useMemo(() => {
    if (ranked.length === 0) return [];
    const baseWindow = selectNearbyWindow(ranked, myIndex);
    const firstItem = baseWindow[0];
    const lastItem = baseWindow[baseWindow.length - 1];

    const baseStartIndex = ranked.findIndex((r) => r.entry.uid === firstItem?.entry.uid);
    const baseEndIndex = ranked.findIndex((r) => r.entry.uid === lastItem?.entry.uid);

    const start = Math.max(0, (baseStartIndex >= 0 ? baseStartIndex : 0) - extraAbove);
    const end = Math.min(ranked.length, (baseEndIndex >= 0 ? baseEndIndex + 1 : baseWindow.length) + extraBelow);

    return ranked.slice(start, end);
  }, [ranked, myIndex, extraAbove, extraBelow]);

  function handleScroll(e: UIEvent<HTMLUListElement>) {
    const el = e.currentTarget;
    const firstItem = visibleWindow[0];
    const lastItem = visibleWindow[visibleWindow.length - 1];

    if (el.scrollTop < 10 && !loadingAbove && firstItem && firstItem.rank > 1) {
      setLoadingAbove(true);
      setTimeout(() => {
        setExtraAbove((prev) => prev + 10);
        setLoadingAbove(false);
      }, 450);
    }

    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distFromBottom < 10 && !loadingBelow && lastItem && lastItem.rank < ranked.length) {
      setLoadingBelow(true);
      setTimeout(() => {
        setExtraBelow((prev) => prev + 10);
        setLoadingBelow(false);
      }, 450);
    }
  }

  if (ranked.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-5 py-8 sm:px-6">
        <p className="text-center font-display text-sm text-color_textsecondary italic">
          Henüz tahmin gönderen olmadı.
        </p>
      </div>
    );
  }

  return (
    <ul
      onScroll={handleScroll}
      className="no-scrollbar min-h-0 flex-1 divide-y divide-border/30 overflow-y-auto px-2 py-3 sm:px-3"
      /* A deeper fade band at both edges (was 21px) so rows dissolve into
         the frame instead of stopping at a near-hard line. */
      style={{
        maskImage: "linear-gradient(to bottom, transparent 0%, black 52px, black calc(100% - 52px), transparent 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 52px, black calc(100% - 52px), transparent 100%)",
      }}
    >
      {loadingAbove && (
        <li className="flex items-center justify-center gap-1.5 py-2.5 text-[0.75rem] text-color_textsecondary font-mono">
          <Loader2 className="size-3.5 animate-spin text-color_textsecondary" />
          <span>Yükleniyor...</span>
        </li>
      )}

      {visibleWindow.map(({ entry, rank }: RankedEntry) => {
        const isMe = entry.uid === myUid;
        const named = { firstName: entry.firstName, lastName: playersByUid.get(entry.uid)?.lastName };
        return (
          <li
            key={entry.uid}
            onClick={() => onSelectParticipant(entry.uid)}
            className={cn(
              "group flex cursor-pointer items-center gap-3 rounded-lg px-3.5 py-2.5 transition-all duration-150 ease-[var(--ease-cotton)] hover:bg-color_hoverfill",
              isMe && "bg-color_gold/10 font-semibold"
            )}
          >
            <span className={cn("w-5 shrink-0 font-mono text-xs sm:text-sm tnum", rank <= 3 ? "font-bold text-color_gold" : "text-color_textsecondary")}>
              {String(rank).padStart(2, "0")}
            </span>
            <Avatar className="size-9 shrink-0 ring-1 ring-border/50">
              <AvatarImage src={entry.photoURL} alt="" />
              <AvatarFallback className="font-mono text-xs text-color_textsecondary">
                {initials(named)}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1 truncate font-display text-xs sm:text-sm text-color_text group-hover:underline">
              {fullName(named)}
            </span>
            <span className="shrink-0 rounded-md bg-color_text/10 px-2.5 py-1 font-mono text-xs font-bold text-color_text tnum">
              {entry.points}
            </span>
          </li>
        );
      })}

      {loadingBelow && (
        <li className="flex items-center justify-center gap-1.5 py-2.5 text-[0.75rem] text-color_textsecondary font-mono">
          <Loader2 className="size-3.5 animate-spin text-color_textsecondary" />
          <span>Yükleniyor...</span>
        </li>
      )}
    </ul>
  );
}

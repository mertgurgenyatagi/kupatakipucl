import { useMemo } from "react";
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
 * Home's league-phase "standings around me" widget — a 5-row slice of the
 * full leaderboard, sliding to stay centered on the viewer wherever
 * possible. Replaces the Katılımcılar participant-list widget on this page
 * (design spec 2026-08-03, "nearby standings" section). No title band, per
 * this page's no-header convention.
 */
export function NearbyStandingsList({ entries, players, myUid, onSelectParticipant }: NearbyStandingsListProps) {
  const playersByUid = useMemo(() => buildPlayersByUid(players), [players]);
  const ranked = useMemo(() => assignRanks(entries), [entries]);
  const myIndex = ranked.findIndex((r) => r.entry.uid === myUid);
  const windowed = useMemo(() => selectNearbyWindow(ranked, myIndex), [ranked, myIndex]);

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
    <ul className="no-scrollbar min-h-0 flex-1 divide-y divide-border/50 overflow-y-auto px-3 sm:px-4">
      {windowed.map(({ entry, rank }: RankedEntry) => {
        const isMe = entry.uid === myUid;
        const named = { firstName: entry.firstName, lastName: playersByUid.get(entry.uid)?.lastName };
        return (
          <li
            key={entry.uid}
            onClick={() => onSelectParticipant(entry.uid)}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 transition-colors duration-150 ease-[var(--ease-cotton)] hover:bg-color_text/[0.06]",
              isMe && "bg-color_accent/10"
            )}
          >
            <span className="w-6 shrink-0 font-mono text-xs text-color_textsecondary tnum">
              {String(rank).padStart(2, "0")}
            </span>
            <Avatar className="size-8 shrink-0">
              <AvatarImage src={entry.photoURL} alt="" />
              <AvatarFallback className="font-mono text-[0.6rem] text-color_textsecondary">
                {initials(named)}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1 truncate font-display text-sm text-color_text">{fullName(named)}</span>
            <span className="shrink-0 font-mono text-sm font-medium text-color_text tnum">{entry.points}</span>
          </li>
        );
      })}
    </ul>
  );
}

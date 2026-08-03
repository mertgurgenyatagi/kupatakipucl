import { memo, useMemo } from "react";
import { LeaderboardEntry } from "./leaderboardTypes";
import { Player } from "../profile/usePlayers";
import { buildPlayersByUid } from "../profile/playersByUid";
import { fullName, initials } from "../profile/deletedAccount";
import { assignRanks } from "./ranking";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Frame, FrameBody } from "@/components/ui/frame";
import { cn } from "@/lib/utils";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  /** Needed to resolve lastName for signed-in viewers — LeaderboardEntry no
   *  longer carries it (2026-08-02 name-privacy change). */
  players: Player[];
  /** The UID of the current viewer, used to highlight their own row. */
  myUid?: string;
  /** Gate for the hover highlight — true once the tournament has started
   *  (DESIGN-SPEC: the brief's "only active after starting"). */
  revealCorrectness?: boolean;
  /** Fires with the hovered participant's uid, or null on hover-out — the
   *  caller uses this to highlight that participant's currently-correct
   *  teams on the team table alongside. */
  onHoverEntry?: (uid: string | null) => void;
  /** Fires with a participant's uid on click (or Enter/Space) — the caller
   *  uses this to open that participant's dossier popup. Same gate as the
   *  hover highlight: only live once correctness is actually revealable. */
  onSelectEntry?: (uid: string) => void;
}

/**
 * The standings, as one prominent oblong frame (DESIGN-SPEC §0b) — no title
 * band (Mert's golden rule: no widget on this page carries a label). Rank
 * numerals left, names in the editorial serif, points aligned right, dotted
 * leaders carrying the eye across (§52, the Ledger Rule). The record scrolls
 * inside the frame; the frame itself never makes the document scroll (§55).
 *
 * Once the tournament is under way, hovering a participant highlights which
 * of their picks are currently landing directly on the team table alongside
 * (a faint green wash on those rows) rather than popping up a separate card.
 * Before that, no dead hover state exists at all.
 *
 * Wrapped in `memo`: entries/revealCorrectness/onHoverEntry/onSelectEntry
 * are all stable references from LeaderboardPage, so without this, every
 * hover-driven re-render there (a state update just to inform TeamTable
 * which teams to highlight) was needlessly re-rendering this component's
 * full 50-row table too.
 */
export const LeaderboardTable = memo(function LeaderboardTable({
  entries,
  players,
  myUid,
  revealCorrectness = false,
  onHoverEntry,
  onSelectEntry,
}: LeaderboardTableProps) {
  const ranked = assignRanks(entries);
  const playersByUid = useMemo(() => buildPlayersByUid(players), [players]);

  return (
    <Frame className="h-full animate-cotton-rise border-color_border1/35">
      <FrameBody>
        {entries.length === 0 ? (
          <div className="flex flex-1 items-center px-6 py-12">
            <p className="font-display text-xl text-color_textsecondary italic">
              Henüz tahmin gönderen olmadı.
            </p>
          </div>
        ) : (
          <div className="no-scrollbar min-h-0 flex-1 px-2 sm:px-3 lg:overflow-y-auto">
            <Table className="text-sm">
              <TableHeader className="sticky top-0 z-10 bg-card [&_tr]:border-b [&_tr]:border-color_border1">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-10 w-14 pl-3 font-mono text-[0.6rem] font-medium tracking-[0.22em] text-color_textsecondary uppercase">
                    Sıra
                  </TableHead>
                  <TableHead className="h-10 w-10 p-0" aria-label="Fotoğraf" />
                  <TableHead className="h-10 font-mono text-[0.6rem] font-medium tracking-[0.22em] text-color_textsecondary uppercase">
                    Katılımcı
                  </TableHead>
                  <TableHead className="h-10 pr-4 text-right font-mono text-[0.6rem] font-medium tracking-[0.22em] text-color_textsecondary uppercase">
                    Puan
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranked.map(({ entry, rank }, index) => {
                  const canReveal = revealCorrectness && entry.ranking.length > 0;
                  const isMe = entry.uid === myUid;
                  return (
                    <TableRow
                      key={entry.uid}
                      style={{ animationDelay: `${Math.min(index * 45, 900)}ms` }}
                      onMouseEnter={canReveal ? () => onHoverEntry?.(entry.uid) : undefined}
                      onMouseLeave={canReveal ? () => onHoverEntry?.(null) : undefined}
                      onClick={canReveal ? () => onSelectEntry?.(entry.uid) : undefined}
                      onKeyDown={
                        canReveal
                          ? (e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                onSelectEntry?.(entry.uid);
                              }
                            }
                          : undefined
                      }
                      tabIndex={canReveal ? 0 : undefined}
                      aria-haspopup={canReveal ? "dialog" : undefined}
                      className={cn(
                        "group animate-cotton-rise border-b border-color_border1/60 transition-colors duration-150 ease-[var(--ease-cotton)] hover:bg-color_hoverfill",
                        canReveal && "cursor-pointer outline-none focus-visible:bg-color_hoverfill focus-visible:ring-1 focus-visible:ring-color_border2/50 focus-visible:ring-inset",
                        isMe && "bg-color_gold/10"
                      )}
                    >
                      <TableCell className="py-2.5 pl-3 align-middle">
                        <span className="font-mono text-xs tracking-tight text-color_textsecondary tnum">
                          {String(rank).padStart(2, "0")}
                        </span>
                      </TableCell>

                      {/* Photo — full saturation by default (Mert: "no
                          need to hover"). */}
                      <TableCell className="py-1.5 pr-0 pl-0 align-middle">
                        <Avatar className="size-7">
                          <AvatarImage src={entry.photoURL} alt="" />
                          <AvatarFallback className="bg-secondary font-mono text-[0.6rem] text-color_secondary">
                            {initials({ firstName: entry.firstName, lastName: playersByUid.get(entry.uid)?.lastName })}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>

                      {/* Name — the ledger signature. When canReveal, the
                          row's hover (above) drives a highlight on the team
                          table instead of popping up a card here. */}
                      <TableCell className="w-full py-2.5 align-middle">
                        <span className="flex min-w-0 items-baseline gap-3">
                          <span className="truncate font-display text-sm font-medium text-color_text">
                            {fullName({ firstName: entry.firstName, lastName: playersByUid.get(entry.uid)?.lastName })}
                          </span>
                        </span>
                      </TableCell>

                      {/* Points — aligned right, tabular (the Ledger Rule) */}
                      <TableCell className="py-2.5 pr-4 text-right align-middle">
                        <span className="font-mono text-sm font-medium tracking-tight text-color_text tnum">
                          {entry.points}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </FrameBody>
    </Frame>
  );
});

import { PreviewCard } from "@base-ui/react/preview-card";
import { LeaderboardEntry } from "./leaderboardTypes";
import { TeamResult } from "./teamResultTypes";
import { assignRanks } from "./ranking";
import { PickCorrectnessCard } from "./PickCorrectnessCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Frame,
  FrameHeader,
  FrameTitle,
  FrameMeta,
  FrameBody,
} from "@/components/ui/frame";
import { cn } from "@/lib/utils";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  /** Live team results — only needed for the correctness reveal. */
  results?: Record<string, TeamResult>;
  /** Gate for the hover reveal — true once the tournament has started
   *  (DESIGN-SPEC: the brief's "only active after starting"). */
  revealCorrectness?: boolean;
}

function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/**
 * The standings, as one prominent oblong frame (DESIGN-SPEC §0b). A navy
 * header band tops a press-white record: rank numerals left, names in the
 * editorial serif, points aligned right, dotted leaders carrying the eye
 * across (§52, the Ledger Rule). The record scrolls inside the frame; the
 * frame itself never makes the document scroll (§55).
 *
 * Once the tournament is under way, hovering a participant reveals which of
 * their picks are currently landing — quiet, factual, brass-marked (see
 * PickCorrectnessCard). Before that, no dead hover state exists at all.
 */
export function LeaderboardTable({
  entries,
  results = {},
  revealCorrectness = false,
}: LeaderboardTableProps) {
  const ranked = assignRanks(entries);

  return (
    <Frame className="h-full animate-cotton-rise border-navy-line/35">
      <FrameHeader tone="navy">
        <FrameTitle className="text-navy-ink">Sıralama</FrameTitle>
        <FrameMeta className="text-navy-muted">Sezon 2026/27</FrameMeta>
      </FrameHeader>

      <FrameBody>
        {entries.length === 0 ? (
          <div className="flex flex-1 items-center px-6 py-12">
            <p className="font-display text-xl text-muted-foreground italic">
              Henüz tahmin gönderen olmadı.
            </p>
          </div>
        ) : (
          <div className="min-h-0 flex-1 px-2 sm:px-3 lg:overflow-y-auto">
            <Table className="text-base">
              <TableHeader className="sticky top-0 z-10 bg-card [&_tr]:border-b [&_tr]:border-border">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-10 w-14 pl-3 font-mono text-[0.6rem] font-medium tracking-[0.22em] text-muted-foreground uppercase">
                    Sıra
                  </TableHead>
                  <TableHead className="h-10 w-10 p-0" aria-label="Fotoğraf" />
                  <TableHead className="h-10 font-mono text-[0.6rem] font-medium tracking-[0.22em] text-muted-foreground uppercase">
                    Katılımcı
                  </TableHead>
                  <TableHead className="h-10 pr-4 text-right font-mono text-[0.6rem] font-medium tracking-[0.22em] text-muted-foreground uppercase">
                    Puan
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranked.map(({ entry, rank }, index) => {
                  const leader = rank === 1;
                  const canReveal = revealCorrectness && entry.ranking.length > 0;
                  return (
                    <TableRow
                      key={entry.uid}
                      style={{ animationDelay: `${Math.min(index * 45, 900)}ms` }}
                      className={cn(
                        "group animate-cotton-rise border-b border-border/60 transition-colors duration-300 ease-[var(--ease-cotton)] hover:bg-accent",
                        leader && "bg-brass/[0.07]"
                      )}
                    >
                      {/* Rank — brass only for rank 01, the one earned
                          distinction (§16, the plaque). */}
                      <TableCell className="py-3 pl-3 align-middle">
                        <span
                          className={cn(
                            "font-mono text-sm tracking-tight tnum",
                            leader ? "text-brass" : "text-muted-foreground"
                          )}
                        >
                          {String(rank).padStart(2, "0")}
                        </span>
                      </TableCell>

                      {/* Photo — real, muted at rest, warms on hover
                          (the crowd radiating in, §26/§27/§34) */}
                      <TableCell className="py-2 pr-0 pl-0 align-middle">
                        <Avatar className="size-8 opacity-90 grayscale transition duration-500 ease-[var(--ease-cotton)] group-hover:opacity-100 group-hover:grayscale-0">
                          <AvatarImage src={entry.photoURL} alt="" />
                          <AvatarFallback className="bg-secondary font-mono text-[0.6rem] text-navy-text">
                            {initials(entry.firstName, entry.lastName)}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>

                      {/* Name + dotted leader — the ledger signature. Once the
                          tournament is live, this is the correctness-reveal
                          trigger; before that it's a plain cell. */}
                      <TableCell className="w-full py-3 align-middle">
                        {canReveal ? (
                          <PreviewCard.Root>
                            <PreviewCard.Trigger
                              render={<span />}
                              className="flex min-w-0 cursor-default items-baseline gap-3 outline-none"
                            >
                              <span className="truncate font-display text-[1.05rem] font-medium text-ink underline decoration-dotted decoration-silver/40 underline-offset-[6px] transition-colors duration-300 group-hover:decoration-brass/70 data-[popup-open]:decoration-brass">
                                {entry.firstName} {entry.lastName}
                              </span>
                              <span
                                aria-hidden
                                className="hidden h-px flex-1 translate-y-[-0.28em] border-b border-dotted border-silver/50 sm:block"
                              />
                            </PreviewCard.Trigger>
                            <PreviewCard.Portal>
                              <PreviewCard.Positioner
                                side="left"
                                align="center"
                                sideOffset={14}
                                collisionPadding={16}
                              >
                                <PreviewCard.Popup className="origin-[var(--transform-origin)] transition-[transform,opacity] duration-200 ease-[var(--ease-cotton)] data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0 data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0">
                                  <PickCorrectnessCard entry={entry} results={results} />
                                </PreviewCard.Popup>
                              </PreviewCard.Positioner>
                            </PreviewCard.Portal>
                          </PreviewCard.Root>
                        ) : (
                          <span className="flex min-w-0 items-baseline gap-3">
                            <span className="truncate font-display text-[1.05rem] font-medium text-ink">
                              {entry.firstName} {entry.lastName}
                            </span>
                            <span
                              aria-hidden
                              className="hidden h-px flex-1 translate-y-[-0.28em] border-b border-dotted border-silver/50 sm:block"
                            />
                          </span>
                        )}
                      </TableCell>

                      {/* Points — aligned right, tabular (the Ledger Rule) */}
                      <TableCell className="py-3 pr-4 text-right align-middle">
                        <span
                          className={cn(
                            "font-mono text-base tracking-tight tnum",
                            leader ? "font-semibold text-brass" : "font-medium text-navy-text"
                          )}
                        >
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
}

import { LeaderboardEntry } from "./leaderboardTypes";
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
 */
export function LeaderboardTable({ entries }: LeaderboardTableProps) {
  const ranked = assignRanks(entries);

  return (
    <Frame className="h-full animate-cotton-rise">
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
                          <AvatarFallback className="bg-secondary font-mono text-[0.6rem] text-navy">
                            {initials(entry.firstName, entry.lastName)}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>

                      {/* Name + dotted leader — the ledger signature */}
                      <TableCell className="w-full py-3 align-middle">
                        <span className="flex min-w-0 items-baseline gap-3">
                          <span className="truncate font-display text-[1.05rem] font-medium text-ink">
                            {entry.firstName} {entry.lastName}
                          </span>
                          <span
                            aria-hidden
                            className="hidden h-px flex-1 translate-y-[-0.28em] border-b border-dotted border-silver/50 sm:block"
                          />
                        </span>
                      </TableCell>

                      {/* Points — aligned right, tabular (the Ledger Rule) */}
                      <TableCell className="py-3 pr-4 text-right align-middle">
                        <span
                          className={cn(
                            "font-mono text-base tracking-tight tnum",
                            leader ? "font-semibold text-brass" : "font-medium text-navy"
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

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
import { cn } from "@/lib/utils";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
}

function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/**
 * The standings ledger. A tight, monospace-inflected index — rank numerals
 * on the left, names in the editorial serif, points aligned right, dotted
 * leaders carrying the eye across (DESIGN-SPEC §52, the Ledger Rule). Not a
 * boxed data-table in a dashboard: the record itself, on paper stock.
 */
export function LeaderboardTable({ entries }: LeaderboardTableProps) {
  const ranked = assignRanks(entries);

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col px-5 pt-6 pb-4 sm:px-8 lg:px-12 lg:pt-10">
      {/* Ledger head — pinned above the scrolling record */}
      <header className="flex shrink-0 items-end justify-between gap-4 pb-5">
        <div className="animate-cotton-rise">
          <p className="font-mono text-[0.66rem] uppercase tracking-[0.32em] text-muted-foreground">
            Sezon Klasmanı
          </p>
          <h1 className="mt-1.5 font-display text-4xl leading-[0.95] font-semibold tracking-[-0.015em] text-ink sm:text-5xl lg:text-6xl">
            Sıralama
          </h1>
        </div>
        <p className="shrink-0 pb-1 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground tnum">
          {entries.length} katılımcı
        </p>
      </header>

      {entries.length === 0 ? (
        <div className="flex flex-1 items-center border-t border-border pt-10">
          <p className="font-display text-xl text-muted-foreground italic">
            Henüz tahmin gönderen olmadı.
          </p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 border-t border-border lg:overflow-y-auto">
          <Table className="text-base">
            <TableHeader className="sticky top-0 z-10 bg-background [&_tr]:border-b [&_tr]:border-border">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-9 w-12 pl-1 font-mono text-[0.6rem] font-medium tracking-[0.22em] text-muted-foreground uppercase">
                  Sıra
                </TableHead>
                <TableHead className="h-9 w-10 p-0" aria-label="Fotoğraf" />
                <TableHead className="h-9 font-mono text-[0.6rem] font-medium tracking-[0.22em] text-muted-foreground uppercase">
                  Katılımcı
                </TableHead>
                <TableHead className="h-9 pr-1 text-right font-mono text-[0.6rem] font-medium tracking-[0.22em] text-muted-foreground uppercase">
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
                      "group animate-cotton-rise border-b border-border/70 transition-colors duration-300 ease-[var(--ease-cotton)] hover:bg-accent",
                      leader && "bg-brass/[0.06]"
                    )}
                  >
                    {/* Rank — the index column. Brass only for rank 01,
                        the one earned distinction (§16 plaque). */}
                    <TableCell className="py-3 pl-1 align-middle">
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
                    <TableCell className="py-3 pr-1 text-right align-middle">
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
    </section>
  );
}

import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { TEAMS } from "../predictions/teams";
import { TeamResult } from "./teamResultTypes";
import { qualificationBand, QUALIFICATION_LEGEND, QualificationBand } from "./qualification";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Frame,
  FrameHeader,
  FrameTitle,
  FrameMeta,
  FrameBody,
} from "@/components/ui/frame";
import { cn } from "@/lib/utils";

type SortKey = "position" | "points" | "goalDifference" | "goalsFor" | "goalsAgainst";

interface TeamTableProps {
  results: Record<string, TeamResult>;
}

const COLUMNS: { key: SortKey; label: string; help: string }[] = [
  { key: "position", label: "Sıra", help: "Sıra" },
  { key: "points", label: "Puan", help: "Puan" },
  { key: "goalDifference", label: "Averaj", help: "Averaj" },
  { key: "goalsFor", label: "Attığı", help: "Attığı gol" },
  { key: "goalsAgainst", label: "Yediği", help: "Yediği gol" },
];

/** Band accent — a hairline on the position marker. Brass is reserved for the
 *  direct-qualification places; playoff places get a cool silver; eliminated
 *  places stay bare (§16, brass only for what's earned). */
const BAND_BAR: Record<QualificationBand, string> = {
  direct: "bg-brass",
  playoff: "bg-silver/70",
  eliminated: "bg-border",
};

const BAND_DOT: Record<QualificationBand, string> = {
  direct: "bg-brass",
  playoff: "bg-silver/70",
  eliminated: "bg-border",
};

function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

/**
 * The team table (DESIGN-SPEC §0b frames): a real, data-backed 36-row
 * standing, given the same weight as the participant leaderboard rather than
 * shrunk into a side-widget — Mert's brief wants it "full" and "detailed".
 * Same visual family as the standings frame: navy header band, mono uppercase
 * column labels, tabular numerals, brass reserved for the earned distinction
 * (here, the direct-qualification places). Sortable via clickable column
 * headers with a mono active-sort caret. Before any result exists it degrades
 * to an honest, quiet roster of all 36 teams at zero.
 */
export function TeamTable({ results }: TeamTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("position");
  const hasResults = Object.keys(results).length > 0;

  // --- Pre-season: no results yet. An honest alphabetical roster, all zeros,
  //     no sort affordances (there is nothing meaningful to sort). --------
  if (!hasResults) {
    return (
      <Frame className="h-full animate-cotton-rise border-navy-line/35">
        <FrameHeader tone="navy">
          <FrameTitle className="text-navy-ink">Puan Durumu</FrameTitle>
          <FrameMeta className="text-navy-muted">36 Takım</FrameMeta>
        </FrameHeader>
        <FrameBody>
          <div className="min-h-0 flex-1 px-2 sm:px-3 lg:overflow-y-auto">
            <Table className="text-base">
              <TableHeader className="sticky top-0 z-10 bg-card [&_tr]:border-b [&_tr]:border-border">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-10 pl-4 font-mono text-[0.6rem] font-medium tracking-[0.22em] text-muted-foreground uppercase">
                    Takım
                  </TableHead>
                  <TableHead className="h-10 pr-4 text-right font-mono text-[0.6rem] font-medium tracking-[0.22em] text-muted-foreground uppercase">
                    Puan
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {TEAMS.map((team, index) => (
                  <TableRow
                    key={team.id}
                    style={{ animationDelay: `${Math.min(index * 22, 700)}ms` }}
                    className="group animate-cotton-rise border-b border-border/60 transition-colors duration-300 ease-[var(--ease-cotton)] hover:bg-accent"
                  >
                    <TableCell className="w-full py-3 pl-4 align-middle">
                      <span className="flex min-w-0 items-baseline gap-3">
                        <span className="truncate font-display text-[1.05rem] font-medium text-ink">
                          {team.name}
                        </span>
                        <span
                          aria-hidden
                          className="hidden h-px flex-1 translate-y-[-0.28em] border-b border-dotted border-silver/50 sm:block"
                        />
                      </span>
                    </TableCell>
                    <TableCell className="py-3 pr-4 text-right align-middle">
                      <span className="font-mono text-base tracking-tight text-muted-foreground tnum">
                        0
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </FrameBody>
      </Frame>
    );
  }

  // --- Live table: sortable, position-banded, full detail. -------------
  const sorted = [...TEAMS].sort((a, b) => {
    const ra = results[a.id];
    const rb = results[b.id];
    if (!ra && !rb) return 0;
    if (!ra) return 1;
    if (!rb) return -1;
    if (sortKey === "position") return ra.position - rb.position;
    return rb[sortKey] - ra[sortKey];
  });

  return (
    <Frame className="h-full animate-cotton-rise border-navy-line/35">
      <FrameHeader tone="navy">
        <FrameTitle className="text-navy-ink">Puan Durumu</FrameTitle>
        <FrameMeta className="text-navy-muted">Lig Aşaması · 36 Takım</FrameMeta>
      </FrameHeader>

      <FrameBody>
        <div className="min-h-0 flex-1 px-2 sm:px-3 lg:overflow-y-auto">
          <Table className="text-base">
            <TableHeader className="sticky top-0 z-10 bg-card [&_tr]:border-b [&_tr]:border-border">
              <TableRow className="hover:bg-transparent">
                {/* Sıra (position) — its own leading column so every header
                    lines up with a body cell. */}
                <TableHead className="h-10 w-16 pr-0 pl-3">
                  <button
                    type="button"
                    title="Sıra"
                    onClick={() => setSortKey("position")}
                    aria-pressed={sortKey === "position"}
                    className={cn(
                      "flex items-center gap-1 pl-1 font-mono text-[0.6rem] font-medium tracking-[0.22em] uppercase transition-colors duration-300 ease-[var(--ease-cotton)] outline-none focus-visible:text-navy-text",
                      sortKey === "position"
                        ? "text-navy-text"
                        : "text-muted-foreground hover:text-ink"
                    )}
                  >
                    <span>Sıra</span>
                    <span aria-hidden className="w-3 shrink-0">
                      {sortKey === "position" && <ChevronUp className="size-3" />}
                    </span>
                  </button>
                </TableHead>
                <TableHead className="h-10 font-mono text-[0.6rem] font-medium tracking-[0.22em] text-muted-foreground uppercase">
                  Takım
                </TableHead>
                {COLUMNS.filter((c) => c.key !== "position").map((col) => {
                  const active = sortKey === col.key;
                  return (
                    <TableHead
                      key={col.key}
                      className={cn(
                        "h-10 px-0 text-right",
                        col.key === "goalsAgainst" && "pr-4"
                      )}
                    >
                      <button
                        type="button"
                        title={col.help}
                        onClick={() => setSortKey(col.key)}
                        aria-pressed={active}
                        className={cn(
                          "ml-auto flex w-full items-center justify-end gap-1 px-2 font-mono text-[0.6rem] font-medium tracking-[0.22em] uppercase transition-colors duration-300 ease-[var(--ease-cotton)] outline-none focus-visible:text-navy-text",
                          active
                            ? "text-navy-text"
                            : "text-muted-foreground hover:text-ink"
                        )}
                      >
                        <span>{col.label}</span>
                        <span aria-hidden className="w-3 shrink-0">
                          {active && <ChevronDown className="size-3" />}
                        </span>
                      </button>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((team, index) => {
                const result = results[team.id];
                const band = result ? qualificationBand(result.position) : null;
                return (
                  <TableRow
                    key={team.id}
                    style={{ animationDelay: `${Math.min(index * 20, 640)}ms` }}
                    className={cn(
                      "group animate-cotton-rise border-b border-border/60 transition-colors duration-300 ease-[var(--ease-cotton)] hover:bg-accent",
                      !result && "opacity-55"
                    )}
                  >
                    {/* Sıra — position with the qualification band accent. */}
                    <TableCell className="py-3 pr-0 pl-3 align-middle">
                      <span className="flex items-center gap-2.5">
                        <span
                          aria-hidden
                          className={cn(
                            "h-5 w-[3px] shrink-0 rounded-full",
                            band ? BAND_BAR[band] : "bg-transparent"
                          )}
                        />
                        <span
                          className={cn(
                            "w-6 shrink-0 text-right font-mono text-sm tracking-tight tnum",
                            band === "direct" ? "text-brass" : "text-muted-foreground"
                          )}
                        >
                          {result ? String(result.position).padStart(2, "0") : "--"}
                        </span>
                      </span>
                    </TableCell>

                    {/* Team name + dotted leader — the ledger signature. */}
                    <TableCell className="w-full py-3 align-middle">
                      <span className="flex min-w-0 items-baseline gap-3">
                        <span className="truncate font-display text-[1.05rem] font-medium text-ink">
                          {team.name}
                        </span>
                        <span
                          aria-hidden
                          className="hidden h-px flex-1 translate-y-[-0.28em] border-b border-dotted border-silver/40 lg:block"
                        />
                      </span>
                    </TableCell>

                    <TableCell className="py-3 pr-2 text-right align-middle">
                      <span className="font-mono text-base font-medium tracking-tight text-navy-text tnum">
                        {result?.points ?? "-"}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 pr-2 text-right align-middle">
                      <span className="font-mono text-sm tracking-tight text-ink tnum">
                        {result ? signed(result.goalDifference) : "-"}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 pr-2 text-right align-middle">
                      <span className="font-mono text-sm tracking-tight text-muted-foreground tnum">
                        {result?.goalsFor ?? "-"}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 pr-4 text-right align-middle">
                      <span className="font-mono text-sm tracking-tight text-muted-foreground tnum">
                        {result?.goalsAgainst ?? "-"}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Qualification legend — a quiet key to the band accents. */}
        <div className="shrink-0 border-t border-border/70 px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
            {QUALIFICATION_LEGEND.map((item) => (
              <span key={item.band} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={cn("h-2.5 w-[3px] rounded-full", BAND_DOT[item.band])}
                />
                <span className="font-mono text-[0.58rem] tracking-[0.14em] text-muted-foreground uppercase">
                  {item.range} {item.label}
                </span>
              </span>
            ))}
          </div>
        </div>
      </FrameBody>
    </Frame>
  );
}

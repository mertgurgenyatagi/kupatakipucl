import { Check } from "lucide-react";
import { LeaderboardEntry } from "./leaderboardTypes";
import { TeamResult } from "./teamResultTypes";
import { evaluatePicks, POINTS_PER_CORRECT_PICK } from "./scoring";
import { TEAMS } from "../predictions/teams";

const TEAM_NAME = new Map(TEAMS.map((t) => [t.id, t.name]));

interface PickCorrectnessCardProps {
  entry: LeaderboardEntry;
  results: Record<string, TeamResult>;
}

/**
 * The reveal behind a participant row, live only once the tournament has
 * started (§ gated by the caller). It answers Mert's brief question — "which
 * teams are they currently getting right" — quietly and factually: the picks
 * that are hitting, marked with the one brass glint reserved for what's
 * earned (§16), against a plain count of how many of their placed picks have
 * landed. No traffic-light red/green — a hit is brass, everything else simply
 * isn't listed.
 */
export function PickCorrectnessCard({ entry, results }: PickCorrectnessCardProps) {
  const evaluations = evaluatePicks(entry.ranking, results);
  const placed = evaluations.filter((e) => e.actualPosition !== null);
  const hits = evaluations.filter((e) => e.correct);

  return (
    <div className="w-[292px] overflow-hidden rounded-[var(--radius-2xl)] border border-border/70 bg-card shadow-frame">
      <div className="flex items-baseline justify-between gap-3 border-b border-border/70 bg-navy px-4 py-3">
        <span className="truncate font-display text-[1.05rem] font-medium text-navy-ink">
          {entry.firstName} {entry.lastName}
        </span>
        <span className="shrink-0 font-mono text-[0.62rem] tracking-[0.18em] text-navy-muted tnum uppercase">
          {hits.length}/{placed.length} isabet
        </span>
      </div>

      <div className="px-4 py-3">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="font-mono text-[0.56rem] tracking-[0.2em] text-muted-foreground uppercase">
            İsabetli tahminler
          </span>
          <span className="font-mono text-[0.62rem] tracking-tight text-navy-text tnum">
            {hits.length * POINTS_PER_CORRECT_PICK} puan
          </span>
        </div>

        {hits.length === 0 ? (
          <p className="py-2 font-display text-[0.95rem] text-muted-foreground italic">
            Henüz isabet yok.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {hits.map((hit) => (
              <li key={hit.teamId} className="flex items-center gap-1.5">
                <Check className="size-3 shrink-0 text-brass" strokeWidth={2.5} />
                <span className="truncate font-display text-[0.92rem] text-ink">
                  {TEAM_NAME.get(hit.teamId) ?? hit.teamId}
                </span>
                <span className="ml-auto shrink-0 font-mono text-[0.56rem] text-muted-foreground tnum">
                  {hit.predictedPosition}·{hit.actualPosition}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

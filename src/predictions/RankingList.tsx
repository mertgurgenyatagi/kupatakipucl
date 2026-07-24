import { TEAMS } from "./teams";
import { TeamCrest } from "../leaderboard/TeamCrest";
import { cn } from "@/lib/utils";

interface RankingListProps {
  ranking: string[];
  /** Whether each team's prediction is currently landing correct — omitted
   *  wherever the caller has no live results to compare against yet, in
   *  which case no row glows. */
  correctness?: Record<string, boolean>;
  /** The average position everyone (not just this list's owner) predicted
   *  for each team — omitted wherever the caller has no other participants'
   *  rankings loaded yet. */
  averagePositions?: Record<string, number>;
  /** Fires with a team's id on row click — opens that team's own dossier
   *  (TeamPopup.tsx), the same cross-link every other team listing in the
   *  app already has (TeamTable.tsx, ParticipantPopup.tsx's predictions
   *  grid). Omitted wherever the caller hasn't wired a popup up yet, in
   *  which case rows are plain, non-interactive text like before. */
  onSelectTeam?: (teamId: string) => void;
}

export function RankingList({ ranking, correctness, averagePositions, onSelectTeam }: RankingListProps) {
  const teamsById = new Map(TEAMS.map((team) => [team.id, team]));

  return (
    <ol className="flex flex-col gap-2">
      {ranking.map((id, index) => {
        const team = teamsById.get(id);
        const isCorrect = correctness?.[id] ?? false;
        const average = averagePositions?.[id];
        return (
          <li
            key={id}
            onClick={onSelectTeam ? () => onSelectTeam(id) : undefined}
            className={cn(
              "flex items-center gap-3.5 rounded-lg border px-4 py-3 transition-shadow duration-500 ease-[var(--ease-cotton)]",
              onSelectTeam && "cursor-pointer hover:border-border",
              isCorrect
                ? "border-brass/50 bg-brass/[0.08] shadow-[0_0_18px_rgba(31,138,101,0.4)]"
                : "border-border/50 bg-background"
            )}
          >
            <TeamCrest teamId={id} className="size-8 shrink-0" />
            <span className="min-w-0 flex-1 truncate font-display text-base text-ink">
              {team?.name ?? id}
            </span>
            {average != null && (
              <span className="shrink-0 font-mono text-sm text-muted-foreground tnum">
                {average.toFixed(1)}
              </span>
            )}
            <span className="w-7 shrink-0 text-right font-display text-xl font-bold text-amber-400 tnum">
              {index + 1}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

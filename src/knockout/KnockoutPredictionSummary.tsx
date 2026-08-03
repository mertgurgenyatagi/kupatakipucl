import { Trophy } from "lucide-react";
import { TEAMS, teamCrestSrc, Team } from "../predictions/teams";
import { KnockoutPrediction } from "./knockoutTypes";
import { cn } from "@/lib/utils";

interface Props {
  prediction: KnockoutPrediction;
  onSelectTeam?: (teamId: string) => void;
}

function findTeam(id: string): Team | null {
  if (!id) return null;
  return (
    TEAMS.find((t) => t.id === id) ?? {
      id,
      name: id.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
      shortName: id.slice(0, 3).toUpperCase(),
    }
  );
}

export function KnockoutPredictionSummary({ prediction, onSelectTeam }: Props) {
  const championTeam = findTeam(prediction.champion);
  const finalists = prediction.finalists.map(findTeam).filter(Boolean) as Team[];
  const semiFinalists = prediction.semiFinalists.map(findTeam).filter(Boolean) as Team[];
  const quarterFinalists = prediction.quarterFinalists.map(findTeam).filter(Boolean) as Team[];

  return (
    <div className="flex flex-col gap-4 p-1 select-none">
      {/* Champion Hero Card */}
      <div className="relative flex flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4">
        <div className="flex size-14 items-center justify-center rounded-full border border-amber-400/60 bg-amber-400/20 text-amber-300">
          <Trophy className="size-7" />
        </div>
        <span className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.25em] text-amber-300/80">
          Şampiyon Tahmini
        </span>
        {championTeam && (
          <button
            type="button"
            onClick={() => onSelectTeam?.(championTeam.id)}
            className="flex items-center gap-3 rounded-full border border-amber-400/50 bg-amber-400/15 px-4 py-2 text-base font-bold text-amber-200 transition-transform duration-200 hover:scale-105"
          >
            <img src={teamCrestSrc(championTeam.id)} alt="" aria-hidden className="size-6 object-contain" />
            <span className="font-mono">{championTeam.name}</span>
          </button>
        )}
      </div>

      {/* Finalists */}
      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.18em] text-color_textsecondary">
          Finalistler (2 Takım)
        </span>
        <div className="grid grid-cols-2 gap-2">
          {finalists.map((team) => (
            <SummaryTeamPill key={team.id} team={team} onClick={() => onSelectTeam?.(team.id)} accent="gold" />
          ))}
        </div>
      </div>

      {/* Semi-Finalists */}
      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.18em] text-color_textsecondary">
          Yarı Finalistler (4 Takım)
        </span>
        <div className="grid grid-cols-2 gap-2">
          {semiFinalists.map((team) => (
            <SummaryTeamPill key={team.id} team={team} onClick={() => onSelectTeam?.(team.id)} accent="indigo" />
          ))}
        </div>
      </div>

      {/* Quarter-Finalists */}
      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.18em] text-color_textsecondary">
          Çeyrek Finalistler (8 Takım)
        </span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {quarterFinalists.map((team) => (
            <SummaryTeamPill key={team.id} team={team} onClick={() => onSelectTeam?.(team.id)} accent="indigo" />
          ))}
        </div>
      </div>
    </div>
  );
}

function SummaryTeamPill({
  team,
  onClick,
  accent = "indigo",
}: {
  team: Team;
  onClick?: () => void;
  accent?: "indigo" | "gold";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-10 w-full items-center gap-2.5 rounded-lg border px-2.5 text-left transition-all duration-200",
        accent === "gold"
          ? "border-amber-400/30 bg-amber-400/10 text-amber-200 hover:border-amber-400/60 hover:bg-amber-400/20"
          : "border-white/10 bg-white/[0.04] text-white/90 hover:border-white/25 hover:bg-white/10"
      )}
    >
      <img src={teamCrestSrc(team.id)} alt="" aria-hidden className="size-5 shrink-0 object-contain" />
      <span className="truncate font-mono text-xs font-bold">{team.shortName}</span>
    </button>
  );
}

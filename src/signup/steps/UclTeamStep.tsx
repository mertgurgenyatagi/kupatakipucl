import { useState } from "react";
import { cn } from "@/lib/utils";
import { TEAMS, teamCrestSrc } from "../../predictions/teams";

interface UclTeamStepProps {
  onSelect: (teamId: string | null) => void;
}

// null = nothing chosen yet (confirm stays disabled), "none" = the explicit
// "no team" tile, otherwise a real team id.
type Selection = string | "none" | null;

/**
 * 36 crests + one "no team" tile, sized to fit without any scrolling
 * (10 columns, fixed tiles — a wider/looser grid needed real scroll, which
 * Mert flagged as unacceptable). Select-and-confirm: tap a tile to mark it,
 * tap another to change your mind, then confirm — the template every other
 * quiz question (ChoiceStep) now follows too.
 */
export function UclTeamStep({ onSelect }: UclTeamStepProps) {
  const [selection, setSelection] = useState<Selection>(null);

  const tileClass = (active: boolean) =>
    cn(
      "flex size-14 cursor-pointer items-center justify-center rounded-xl border border-ink/45 bg-background p-2 text-ink transition-colors duration-150 ease-[var(--ease-cotton)] hover:bg-ink hover:text-background",
      active && "bg-ink text-background ring-2 ring-brass"
    );

  return (
    <div className="flex flex-col items-center gap-5">
      <p className="max-w-lg text-balance text-center font-display text-2xl font-light text-ink">
        Şampiyonlar Ligi'nde tuttuğun bir takım var mı?
      </p>
      <div className="grid w-fit grid-cols-10 gap-2">
        {TEAMS.map((team) => (
          <button
            key={team.id}
            type="button"
            title={team.name}
            onClick={() => setSelection(team.id)}
            className={tileClass(selection === team.id)}
          >
            <img src={teamCrestSrc(team.id)} alt={team.name} className="size-full object-contain" />
          </button>
        ))}
        <button
          type="button"
          title="Yok"
          onClick={() => setSelection("none")}
          className={cn(tileClass(selection === "none"), "font-mono text-[0.55rem] font-light tracking-wide uppercase")}
        >
          Yok
        </button>
      </div>
      <button
        type="button"
        disabled={selection === null}
        onClick={() => onSelect(selection === "none" ? null : selection)}
        className="cursor-pointer rounded-full bg-ink px-8 py-3.5 text-base font-semibold text-background transition-opacity disabled:cursor-default disabled:opacity-40"
      >
        Devam et
      </button>
    </div>
  );
}

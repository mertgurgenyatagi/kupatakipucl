import { memo, useCallback } from "react";
import { Team } from "./teams";
import { TeamCrest } from "../leaderboard/TeamCrest";
import { useBoundaryHover } from "./useBoundaryHover";
import { boundaryBandRole } from "./predictionBoundary";
import { Held } from "./rankerState";
import { cn } from "@/lib/utils";

interface TeamSlotListProps {
  ranking: (string | null)[];
  teamsById: Map<string, Team>;
  held: Held | null;
  onSlotClick: (index: number) => void;
}

const ListSlot = memo(function ListSlot({
  index,
  teamId,
  team,
  isHeld,
  anythingHeld,
  inBand,
  isOrigin,
  onClick,
  onHoverStart,
  onMouseLeave,
}: {
  index: number;
  teamId: string | null;
  team: Team | undefined;
  /** This row is the team currently picked up. */
  isHeld: boolean;
  /** Some team is picked up — empty rows become live targets. */
  anythingHeld: boolean;
  inBand: boolean;
  isOrigin: boolean;
  onClick: (index: number) => void;
  /** Stable across renders — the slot builds its own bound handler below, so
   *  the parent doesn't hand down a fresh closure per row and defeat memo. */
  onHoverStart: (index: number) => void;
  onMouseLeave: () => void;
}) {
  const isEmpty = teamId === null;

  const handleClick = useCallback(() => onClick(index), [onClick, index]);

  const handleMouseEnter = useCallback(() => {
    if (teamId !== null) onHoverStart(index);
  }, [teamId, index, onHoverStart]);

  const highlighted = inBand && !isHeld;

  // An empty rank with nothing in hand has nothing to do, so it isn't a
  // button you can press — which also keeps the cursor from suggesting it is.
  const inert = isEmpty && !anythingHeld;

  // Plain <li>, not <motion.li layout>. The layout animation re-measured all
  // 36 slots' bounding boxes on every render while never actually animating
  // anything: the list is a fixed 36 slots keyed by index, so a slot never
  // changes position, only its contents do. That measurement pass was the
  // single biggest cost in both the predictions page and the profile edit
  // popup (2026-08-06).
  return (
    <li>
      <button
        type="button"
        disabled={inert}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={onMouseLeave}
        className={cn(
          "flex h-[42px] w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left select-none outline-none",
          "transition-[border-color,background-color,box-shadow,opacity] duration-200 ease-[var(--ease-cotton)]",
          !inert && "cursor-pointer",
          isEmpty
            ? [
                "border-dashed bg-foreground/[0.01]",
                anythingHeld
                  ? "border-color_border1/60 hover:border-color_accent/80 hover:bg-foreground/[0.06]"
                  : "border-color_border1/40",
              ]
            : [
                "bg-background",
                isHeld
                  ? "border-color_accent bg-foreground/[0.08]"
                  : "border-color_border1/80 hover:border-color_border1 hover:bg-foreground/[0.03]",
              ],
          highlighted && cn("bg-foreground/[0.06]", !isOrigin && "animate-pulse")
        )}
      >
        {/* Rank number */}
        <span className="w-5 shrink-0 text-right font-mono text-sm font-bold text-color_gold tnum">
          {index + 1}
        </span>

        {teamId !== null && team ? (
          <>
            <TeamCrest teamId={team.id} className="size-7 shrink-0" />
            <span className="min-w-0 flex-1 truncate font-display text-sm text-color_text">
              {team.name}
            </span>
          </>
        ) : (
          // Only while a team is in hand — 36 standing instructions is exactly
          // the kind of clutter this screen doesn't need.
          <span className="min-w-0 flex-1 font-display text-xs italic text-color_textsecondary/30">
            {anythingHeld ? "Buraya tıkla" : ""}
          </span>
        )}
      </button>
    </li>
  );
});

/**
 * The left-hand ranking column — 36 numbered ranks. Click a filled rank to
 * pick that team up; click any rank while holding one to put it there.
 * Ranks highlight as live targets while something is held.
 */
export function TeamSlotList({ ranking, teamsById, held, onSlotClick }: TeamSlotListProps) {
  const { activeIndex, handleMouseEnter, handleMouseLeave } = useBoundaryHover();

  return (
    <ol className="no-scrollbar flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
      {ranking.map((teamId, index) => {
        const inBand =
          teamId !== null &&
          activeIndex !== null &&
          boundaryBandRole(index, activeIndex, ranking.length) !== "none";
        return (
          <ListSlot
            key={index}
            index={index}
            teamId={teamId}
            team={teamId !== null ? teamsById.get(teamId) : undefined}
            isHeld={held?.origin === index}
            anythingHeld={held !== null}
            inBand={inBand}
            isOrigin={index === activeIndex}
            onClick={onSlotClick}
            onHoverStart={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          />
        );
      })}
    </ol>
  );
}

import { useCallback, useEffect, useMemo, useReducer } from "react";
import { Team } from "./teams";
import { TeamGrid } from "./TeamGrid";
import { MobileTeamPool } from "./MobileTeamPool";
import { TeamSlotList } from "./TeamSlotList";
import { createRankerState, rankerReducer } from "./rankerState";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/lib/useIsMobile";

interface TeamRankerProps {
  teams: Team[];
  /**
   * Optional: pre-populate the ranking list on mount.
   * Must be a full-length array (same length as `teams`) to take effect —
   * a partial array is ignored and the list starts empty.
   * Used by the profile-page edit widget; the first-time prediction flow
   * leaves this unset so all slots start empty.
   */
  initialOrder?: string[];
  onSubmit: (order: string[]) => void;
}

/**
 * Two-panel ranking UI for the league phase prediction: 36 numbered ranks on
 * the left, the pool of teams on the right.
 *
 * Click a team, then click where it goes. That's the whole interaction — see
 * `rankerState.ts`, which holds every transition as a pure reducer. There is
 * no drag and drop here by design: it was replaced outright because ranking
 * 36 teams by dragging was unreliable on desktop and miserable on a phone.
 */
export function TeamRanker({ teams, initialOrder, onSubmit }: TeamRankerProps) {
  const [{ ranking, held }, dispatch] = useReducer(
    rankerReducer,
    undefined,
    () => createRankerState(teams.length, initialOrder)
  );

  const isMobile = useIsMobile();

  // Escape drops the selection. Captured, and swallowed only while something
  // is actually held, so it doesn't steal Escape from the dialog this widget
  // renders inside on the profile page.
  useEffect(() => {
    if (!held) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      dispatch({ type: "cancel" });
    }
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [held]);

  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => a.name.localeCompare(b.name)),
    [teams]
  );

  const teamsById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  const placedTeamIds = useMemo(
    () => new Set(ranking.filter(Boolean) as string[]),
    [ranking]
  );

  // Stable identities so the 36 memoized rows aren't invalidated every render.
  const handleSlotClick = useCallback(
    (index: number) => dispatch({ type: "clickSlot", index }),
    []
  );
  const handleTeamClick = useCallback(
    (teamId: string) => dispatch({ type: "clickPoolTeam", teamId }),
    []
  );
  const handleBackgroundClick = useCallback(
    () => dispatch({ type: "clickPoolBackground" }),
    []
  );

  const heldPoolTeamId = held?.origin === "pool" ? held.teamId : null;
  const allPlaced = ranking.every((id) => id !== null);

  function handleSubmit() {
    onSubmit(ranking.filter(Boolean) as string[]);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <p className="text-center font-display text-sm text-color_textsecondary">
        Bir takım seç, sonra sıralamadaki yerine tıkla.{" "}
        <span className="text-color_textsecondary/60">
          Yerleştirdiğin takımları geri çekebilir veya yeniden sıralayabilirsin.
        </span>
      </p>

      {/* Two panels — side by side on desktop, stacked on mobile with the
          ranking on top and the pool beneath, per the wireframe. */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
        {/* Ranking column */}
        <div className="flex min-h-0 flex-1 flex-col lg:w-64 lg:flex-none lg:shrink-0">
          <TeamSlotList
            ranking={ranking}
            teamsById={teamsById}
            held={held}
            onSlotClick={handleSlotClick}
          />
        </div>

        {/* Team pool, top-aligned to prevent flexbox overflow clipping */}
        <div className="no-scrollbar flex min-h-0 flex-1 flex-col justify-start overflow-y-auto py-2">
          {isMobile ? (
            <MobileTeamPool
              teams={sortedTeams}
              placedTeamIds={placedTeamIds}
              heldTeamId={heldPoolTeamId}
              onTeamClick={handleTeamClick}
              onBackgroundClick={handleBackgroundClick}
            />
          ) : (
            <TeamGrid
              teams={sortedTeams}
              placedTeamIds={placedTeamIds}
              heldTeamId={heldPoolTeamId}
              onTeamClick={handleTeamClick}
              onBackgroundClick={handleBackgroundClick}
            />
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          variant="outline"
          className="cursor-pointer"
          onClick={() => dispatch({ type: "reset" })}
        >
          Sıfırla
        </Button>
        <Button className="cursor-pointer" disabled={!allPlaced} onClick={handleSubmit}>
          Tamam
        </Button>
      </div>
    </div>
  );
}

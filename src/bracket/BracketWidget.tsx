import { Round, ROUND_ORDER, matchupsForRound, nextRound, previousRound } from "./bracketStructure";
import { BracketState, teamsInMatchup } from "./bracketState";
import { TeamCrest } from "../leaderboard/TeamCrest";

interface BracketWidgetProps {
  bracketState: BracketState;
  currentRound: Round;
  onSelectTeam: (teamId: string) => void;
}

function RoundColumn({
  round,
  bracketState,
  faded,
  onSelectTeam,
}: {
  round: Round;
  bracketState: BracketState;
  faded: boolean;
  onSelectTeam: (teamId: string) => void;
}) {
  return (
    <div
      data-testid={`bracket-widget-round-${round}`}
      className={`flex flex-col gap-2 ${faded ? "opacity-40" : ""}`}
    >
      {matchupsForRound(round).map((matchup) => {
        const [teamA, teamB] = teamsInMatchup(matchup.id, bracketState);
        return (
          <div key={matchup.id} className="flex flex-col gap-1">
            {[teamA, teamB].map((team, index) =>
              team ? (
                <button
                  key={team}
                  type="button"
                  data-testid={`bracket-widget-crest-${round}-${team}`}
                  onClick={() => onSelectTeam(team)}
                  className="flex items-center gap-1"
                >
                  <TeamCrest teamId={team} className="size-5" />
                </button>
              ) : (
                <div key={index} className="size-5" />
              )
            )}
          </div>
        );
      })}
    </div>
  );
}

export function BracketWidget({ bracketState, currentRound, onSelectTeam }: BracketWidgetProps) {
  const prev = previousRound(currentRound);
  const next = nextRound(currentRound);
  const visibleRounds = ROUND_ORDER.filter((round) => round === currentRound || round === prev || round === next);

  return (
    <div className="flex gap-4">
      {visibleRounds.map((round) => (
        <RoundColumn
          key={round}
          round={round}
          bracketState={bracketState}
          faded={round !== currentRound}
          onSelectTeam={onSelectTeam}
        />
      ))}
    </div>
  );
}

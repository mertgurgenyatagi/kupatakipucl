import { Round, ROUND_ORDER, matchupsForRound } from "./bracketStructure";
import { BracketPrediction } from "./bracketPredictionTypes";
import { computeBracketConsensus } from "./bracketConsensus";
import { TeamCrest } from "../leaderboard/TeamCrest";

interface BracketProfileViewProps {
  prediction: BracketPrediction;
  allPredictions: BracketPrediction[];
}

const ROUND_LABEL: Record<Round, string> = {
  ro16: "Son 16",
  qf: "Çeyrek Final",
  sf: "Yarı Final",
  final: "Final",
};

export function BracketProfileView({ prediction, allPredictions }: BracketProfileViewProps) {
  const consensus = computeBracketConsensus(allPredictions);

  return (
    <div className="flex flex-col gap-6">
      {ROUND_ORDER.map((round) => (
        <div key={round} className="flex flex-col gap-2">
          <h4 className="text-xs font-semibold text-color_muted">{ROUND_LABEL[round]}</h4>
          <div className="flex flex-wrap gap-3">
            {matchupsForRound(round).map((matchup) => {
              const ownPick = prediction.picks[matchup.id];
              if (!ownPick) return null;
              const matchupConsensus = consensus.find((c) => c.matchupId === matchup.id);
              const percentage = matchupConsensus?.teamPercentages[ownPick] ?? 0;
              return (
                <div
                  key={matchup.id}
                  data-testid={`bracket-profile-pick-${matchup.id}`}
                  className="flex items-center gap-2 rounded-lg border border-color_border px-3 py-2 text-sm"
                >
                  <TeamCrest teamId={ownPick} className="size-5" />
                  <span>{ownPick}</span>
                  <span className="text-color_muted">%{percentage}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

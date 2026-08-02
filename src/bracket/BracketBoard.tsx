import { useState } from "react";
import { MatchupId, Round, matchupById } from "./bracketStructure";
import { teamsInMatchupForPicks, pickWinner, isSubmissionComplete } from "./bracketSubmission";
import { TeamCrest } from "../leaderboard/TeamCrest";

interface BracketBoardProps {
  ro16Teams: Partial<Record<MatchupId, [string, string]>>;
  onSubmit: (picks: Record<MatchupId, string>) => void;
}

const ROUND_LABEL: Record<Round, string> = {
  ro16: "Son 16",
  qf: "Çeyrek Final",
  sf: "Yarı Final",
  final: "Final",
};

// The real bracket structure (BRACKET_MATCHUPS' feedsInto chain, Plan 1
// Task 1): ro16-1/2 -> qf-1, ro16-3/4 -> qf-2, qf-1/2 -> sf-1 (left half);
// ro16-5/6 -> qf-3, ro16-7/8 -> qf-4, qf-3/4 -> sf-2 (right half);
// sf-1/sf-2 -> final (center). Laid out as two columns of matchups
// converging inward toward the Final in the middle (GREAT_LEAP_SPEC.md
// §5.2's "8 left / 8 right" interaction model) rather than a flat list of
// round-rows.
const LEFT_COLUMNS: MatchupId[][] = [
  ["ro16-1", "ro16-2", "ro16-3", "ro16-4"],
  ["qf-1", "qf-2"],
  ["sf-1"],
];
const RIGHT_COLUMNS: MatchupId[][] = [
  ["sf-2"],
  ["qf-3", "qf-4"],
  ["ro16-5", "ro16-6", "ro16-7", "ro16-8"],
];

function MatchupBox({
  matchupId,
  ro16Teams,
  picks,
  onPick,
}: {
  matchupId: MatchupId;
  ro16Teams: Partial<Record<MatchupId, [string, string]>>;
  picks: Partial<Record<MatchupId, string>>;
  onPick: (matchupId: MatchupId, teamId: string) => void;
}) {
  const [teamA, teamB] = teamsInMatchupForPicks(matchupId, ro16Teams, picks);
  return (
    <div
      data-testid={`matchup-${matchupId}`}
      className="flex flex-col gap-1 rounded-lg border border-color_border p-3"
    >
      {[teamA, teamB].map((team) =>
        team ? (
          <button
            key={team}
            type="button"
            data-testid={`pick-${matchupId}-${team}`}
            onClick={() => onPick(matchupId, team)}
            className={`flex items-center gap-2 rounded-md px-2 py-1 text-left text-sm transition-colors duration-150 ease-[var(--ease-cotton)] ${
              picks[matchupId] === team ? "bg-color_text text-background" : "hover:bg-color_hover"
            }`}
          >
            <TeamCrest teamId={team} className="size-5" />
            {team}
          </button>
        ) : null
      )}
    </div>
  );
}

function BracketColumn({
  matchupIds,
  ro16Teams,
  picks,
  onPick,
}: {
  matchupIds: MatchupId[];
  ro16Teams: Partial<Record<MatchupId, [string, string]>>;
  picks: Partial<Record<MatchupId, string>>;
  onPick: (matchupId: MatchupId, teamId: string) => void;
}) {
  return (
    <div className="flex h-full flex-col justify-around gap-4">
      <h3 className="text-center text-sm font-semibold text-color_muted">
        {ROUND_LABEL[matchupById(matchupIds[0]).round]}
      </h3>
      {matchupIds.map((matchupId) => (
        <MatchupBox key={matchupId} matchupId={matchupId} ro16Teams={ro16Teams} picks={picks} onPick={onPick} />
      ))}
    </div>
  );
}

export function BracketBoard({ ro16Teams, onSubmit }: BracketBoardProps) {
  const [picks, setPicks] = useState<Partial<Record<MatchupId, string>>>({});

  function handlePick(matchupId: MatchupId, teamId: string) {
    setPicks((current) => pickWinner(current, matchupId, teamId));
  }

  const complete = isSubmissionComplete(picks);

  return (
    <div className="flex flex-col gap-8">
      {/* Two columns of matchups converging inward toward the Final in the
          center — GREAT_LEAP_SPEC.md §5.2's "8 left / 8 right" model. */}
      <div className="flex items-stretch gap-4 overflow-x-auto">
        {LEFT_COLUMNS.map((matchupIds, index) => (
          <BracketColumn
            key={`left-${index}`}
            matchupIds={matchupIds}
            ro16Teams={ro16Teams}
            picks={picks}
            onPick={handlePick}
          />
        ))}
        <BracketColumn matchupIds={["final"]} ro16Teams={ro16Teams} picks={picks} onPick={handlePick} />
        {RIGHT_COLUMNS.map((matchupIds, index) => (
          <BracketColumn
            key={`right-${index}`}
            matchupIds={matchupIds}
            ro16Teams={ro16Teams}
            picks={picks}
            onPick={handlePick}
          />
        ))}
      </div>
      <button
        type="button"
        disabled={!complete}
        onClick={() => complete && onSubmit(picks as Record<MatchupId, string>)}
        className="self-start rounded-full bg-color_text px-6 py-3 text-sm font-semibold text-background outline-none transition-all duration-150 ease-[var(--ease-cotton)] hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-color_accent"
      >
        Tahminini Gönder
      </button>
    </div>
  );
}

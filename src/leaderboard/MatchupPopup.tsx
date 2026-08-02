import { memo, useEffect, useMemo, useState } from "react";
import { XIcon } from "lucide-react";
import { TEAM_BY_ID } from "../predictions/teams";
import { FIXTURES, Fixture } from "../devpanel/fixtures";
import { MatchOutcome } from "../devpanel/standings";
import { useDevMatches } from "../devpanel/useDevMatches";
import { LeaderboardEntry } from "./leaderboardTypes";
import { Player } from "../profile/usePlayers";
import { buildPlayersByUid } from "../profile/playersByUid";
import { fullName, initials as sharedInitials } from "../profile/deletedAccount";
import { TeamResult } from "./teamResultTypes";
import { getTeamPredictors, TeamPredictor } from "./teamPredictors";
import { TeamCrest } from "./TeamCrest";
import { TournamentPhase } from "../tournament/tournamentPhase";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Frame, FrameHeader, FrameTitle, FrameBody } from "@/components/ui/frame";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MatchupPopupProps {
  /** The clicked fixture's id, or null when closed — resolved back to a
   *  real Fixture via FIXTURES, same "id in, object looked up inside" shape
   *  as TeamPopup's teamId. */
  fixtureId: string | null;
  onOpenChange: (open: boolean) => void;
  /** Drives the header label (matchday vs. round name) and which per-team
   *  widget renders (predictor list vs. the not-yet-built advance-pick
   *  placeholder). */
  phase: TournamentPhase;
  tournamentStarted: boolean;
  entries: LeaderboardEntry[];
  players: Player[];
  results: Record<string, TeamResult>;
  /** Selecting either team closes this popup and opens TeamPopup for it. */
  onSelectTeam: (teamId: string) => void;
  /** Selecting a predictor closes this popup and opens ParticipantPopup for them. */
  onSelectParticipant: (uid: string) => void;
}

const DATE_FMT = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "short",
  timeZone: "Europe/Istanbul",
});
const TIME_FMT = new Intl.DateTimeFormat("tr-TR", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Europe/Istanbul",
});

const WIDGET_BLOCK = "flex min-h-0 flex-col rounded-xl bg-background border border-color_border1/60";
const NOT_STARTED_MESSAGE = "Turnuva başlamadan bu bilgi görüntülenemez.";
// The knockout-round "who picked this team to advance" feature has no data
// model anywhere yet (PROJECT_STATE §13-B) — this branch renders real,
// styled UI with an honest placeholder instead of a fabricated count/list.
const KNOCKOUT_NOT_BUILT_MESSAGE = "Bu özellik henüz mevcut değil.";

function Placeholder({ message }: { message: string }) {
  return (
    <p className="flex h-full items-center justify-center px-2 text-center font-display text-xs text-color_textsecondary italic">
      {message}
    </p>
  );
}

function goalsForOutcome(outcome: MatchOutcome): { homeGoals: number | null; awayGoals: number | null } {
  if (outcome === "notplayed") return { homeGoals: null, awayGoals: null };
  if (outcome === "homewin") return { homeGoals: 1, awayGoals: 0 };
  if (outcome === "awaywin") return { homeGoals: 0, awayGoals: 1 };
  return { homeGoals: 0, awayGoals: 0 };
}

/** Center column: kickoff date/time before the fixture is decided, the
 *  final score once it is — a neutral, non-team-relative display (unlike
 *  TeamPopup's MatchRow, there's no "our team" here to color a result dot
 *  for). */
function MatchupCenter({ fixture, outcome }: { fixture: Fixture; outcome: MatchOutcome }) {
  const kickoff = new Date(fixture.kickoffUtc);
  if (outcome === "notplayed") {
    return (
      <span className="flex flex-col items-center justify-center gap-0.5 leading-tight">
        <span className="font-mono text-sm text-color_text tnum">{DATE_FMT.format(kickoff)}</span>
        <span className="font-mono text-sm text-color_textsecondary tnum">{TIME_FMT.format(kickoff)}</span>
      </span>
    );
  }
  const { homeGoals, awayGoals } = goalsForOutcome(outcome);
  return (
    <span className="flex flex-col items-center justify-center gap-0.5 leading-tight">
      <span className="font-mono text-lg font-bold text-color_text tnum">
        {homeGoals} - {awayGoals}
      </span>
      <span className="font-mono text-[0.6rem] text-color_textsecondary tnum">{DATE_FMT.format(kickoff)}</span>
    </span>
  );
}

function TeamStatPair({ result, tournamentStarted }: { result: TeamResult | undefined; tournamentStarted: boolean }) {
  return (
    <div className="flex items-baseline justify-center gap-4">
      <span className="flex items-baseline gap-1.5">
        <span className="font-mono text-[0.55rem] tracking-[0.18em] text-color_textsecondary uppercase">Sıra</span>
        <span className="font-display text-sm leading-none font-bold text-color_text tnum">
          {tournamentStarted && result ? `#${result.position}` : "-"}
        </span>
      </span>
      <span className="flex items-baseline gap-1.5">
        <span className="font-mono text-[0.55rem] tracking-[0.18em] text-color_textsecondary uppercase">Puan</span>
        <span className="font-display text-sm leading-none font-bold text-color_text tnum">
          {tournamentStarted && result ? result.points : "-"}
        </span>
      </span>
    </div>
  );
}

/** One team's predictor list — a smaller sibling of TeamPopup's own "who
 *  predicted this team" list (two of these sit side by side here, so rows
 *  are more compact than TeamPopup's single full-height version). */
function PredictorList({
  predictors,
  playersByUid,
  onSelectParticipant,
}: {
  predictors: TeamPredictor[];
  playersByUid: Map<string, Player>;
  onSelectParticipant: (uid: string) => void;
}) {
  if (predictors.length === 0) {
    return (
      <p className="px-2 py-2 font-display text-xs text-color_textsecondary italic">
        Bu takımı tahmin eden katılımcı yok.
      </p>
    );
  }
  return (
    <>
      {predictors.map((p) => (
        <button
          key={p.entry.uid}
          type="button"
          onClick={() => onSelectParticipant(p.entry.uid)}
          className={cn(
            "group flex w-full cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors duration-150 ease-[var(--ease-cotton)] hover:bg-color_hoverfill",
            p.correct && "bg-color_green/[0.12]"
          )}
        >
          <Avatar className="size-5 shrink-0">
            <AvatarImage src={p.entry.photoURL} alt="" />
            <AvatarFallback className="bg-secondary font-mono text-[0.5rem] text-color_secondary">
              {sharedInitials({ firstName: p.entry.firstName, lastName: playersByUid.get(p.entry.uid)?.lastName })}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1 truncate font-display text-xs font-medium text-color_text group-hover:underline">
            {fullName({ firstName: p.entry.firstName, lastName: playersByUid.get(p.entry.uid)?.lastName })}
          </span>
          <span className="shrink-0 text-right font-mono text-xs text-color_textsecondary tnum">
            {p.predictedPosition}
          </span>
        </button>
      ))}
    </>
  );
}

/** One team's detail column — rank/points, then the predictor list (league
 *  phase / pre-knockout) or the knockout placeholder below it. Not rendered
 *  at all pre-tournament — see MatchupPopup's own notstarted branch. */
function TeamColumn({
  result,
  phase,
  tournamentStarted,
  predictors,
  playersByUid,
  onSelectParticipant,
}: {
  result: TeamResult | undefined;
  phase: TournamentPhase;
  tournamentStarted: boolean;
  predictors: TeamPredictor[];
  playersByUid: Map<string, Player>;
  onSelectParticipant: (uid: string) => void;
}) {
  return (
    <div className="flex min-h-0 flex-col gap-2">
      <TeamStatPair result={result} tournamentStarted={tournamentStarted} />
      <div className={cn(WIDGET_BLOCK, "min-h-0 flex-1")}>
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-1.5 py-1.5">
          {!tournamentStarted ? (
            <Placeholder message={NOT_STARTED_MESSAGE} />
          ) : phase === "knockout" ? (
            <Placeholder message={KNOCKOUT_NOT_BUILT_MESSAGE} />
          ) : (
            <PredictorList predictors={predictors} playersByUid={playersByUid} onSelectParticipant={onSelectParticipant} />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The match-detail popup — fills in the two "reserved for a future match-
 * detail view" no-ops in FixtureRow.tsx and TeamPopup.tsx's MatchRow. Same
 * Dialog+Frame recipe as TeamPopup/ParticipantPopup, no internal Firestore
 * fetching beyond useDevMatches (the same source TeamPopup's own match
 * history already reads — real production per-fixture outcomes don't exist
 * yet, a pre-existing gap this inherits rather than solves).
 *
 * Three phase-driven content modes: bare fixture card pre-tournament
 * (nothing else exists yet to show), fixture card + real rank/points +
 * predictor list once the league phase is running, and a real-but-
 * currently-unreachable knockout branch — no knockout fixture data exists
 * anywhere in the app yet, so nothing can trigger this today; it only
 * renders when a caller (currently only this component's own tests) passes
 * phase="knockout" directly.
 */
export const MatchupPopup = memo(function MatchupPopup({
  fixtureId,
  onOpenChange,
  phase,
  tournamentStarted,
  entries,
  players,
  results,
  onSelectTeam,
  onSelectParticipant,
}: MatchupPopupProps) {
  const playersByUid = useMemo(() => buildPlayersByUid(players), [players]);

  // Same "keep showing the last real content while the exit animation
  // plays" trick as TeamPopup/ParticipantPopup.
  const [lastFixtureId, setLastFixtureId] = useState<string | null>(null);
  useEffect(() => {
    if (fixtureId) setLastFixtureId(fixtureId);
  }, [fixtureId]);

  const displayedId = fixtureId ?? lastFixtureId;
  const fixture = displayedId ? (FIXTURES.find((f) => f.id === displayedId) ?? null) : null;

  const { outcomes } = useDevMatches();
  const outcome: MatchOutcome = fixture ? (outcomes[fixture.id] ?? "notplayed") : "notplayed";

  const home = fixture ? TEAM_BY_ID[fixture.homeTeamId] : null;
  const away = fixture ? TEAM_BY_ID[fixture.awayTeamId] : null;

  const homePredictors = useMemo(
    () => (fixture && tournamentStarted ? getTeamPredictors(fixture.homeTeamId, entries, results) : []),
    [fixture, tournamentStarted, entries, results]
  );
  const awayPredictors = useMemo(
    () => (fixture && tournamentStarted ? getTeamPredictors(fixture.awayTeamId, entries, results) : []),
    [fixture, tournamentStarted, entries, results]
  );

  const headerLabel = fixture ? (phase === "knockout" ? "ELEME TURU" : `${fixture.matchday}. HAFTA`) : "";

  return (
    <Dialog open={fixtureId !== null} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-[calc(100%-2rem)] gap-0 rounded-none bg-transparent p-0 ring-0 sm:max-w-3xl"
      >
        {fixture && home && away && (
          <Frame className="max-h-[min(85vh,44rem)] w-full animate-cotton-rise border-color_border1/35">
            <FrameHeader tone="navy">
              <FrameTitle className="text-navy-ink">{headerLabel}</FrameTitle>
              <DialogTitle className="sr-only">
                {home.name} - {away.name}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {home.name} - {away.name} maç detayı: sıra, puan ve bu takımları tahmin eden katılımcılar.
              </DialogDescription>
              <DialogClose
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-navy-ink/70 hover:bg-navy-ink/10 hover:text-navy-ink"
                  />
                }
              >
                <XIcon />
                <span className="sr-only">Kapat</span>
              </DialogClose>
            </FrameHeader>

            <FrameBody className="min-h-0 gap-3 p-3 sm:p-4">
              <div
                className="grid shrink-0 items-center gap-2 px-2 pt-1"
                style={{ gridTemplateColumns: "minmax(0,1fr) 6rem minmax(0,1fr)" }}
              >
                <button
                  type="button"
                  onClick={() => onSelectTeam(home.id)}
                  className="group flex min-w-0 cursor-pointer flex-col items-center gap-1.5"
                >
                  <TeamCrest teamId={home.id} className="size-10" />
                  <span className="truncate font-display text-sm font-medium text-color_text group-hover:underline">
                    {home.name}
                  </span>
                </button>

                <MatchupCenter fixture={fixture} outcome={outcome} />

                <button
                  type="button"
                  onClick={() => onSelectTeam(away.id)}
                  className="group flex min-w-0 cursor-pointer flex-col items-center gap-1.5"
                >
                  <TeamCrest teamId={away.id} className="size-10" />
                  <span className="truncate font-display text-sm font-medium text-color_text group-hover:underline">
                    {away.name}
                  </span>
                </button>
              </div>

              {phase !== "notstarted" && (
                <div className="grid min-h-0 flex-1 grid-cols-2 gap-3">
                  <TeamColumn
                    result={results[home.id]}
                    phase={phase}
                    tournamentStarted={tournamentStarted}
                    predictors={homePredictors}
                    playersByUid={playersByUid}
                    onSelectParticipant={onSelectParticipant}
                  />
                  <TeamColumn
                    result={results[away.id]}
                    phase={phase}
                    tournamentStarted={tournamentStarted}
                    predictors={awayPredictors}
                    playersByUid={playersByUid}
                    onSelectParticipant={onSelectParticipant}
                  />
                </div>
              )}
            </FrameBody>
          </Frame>
        )}
      </DialogContent>
    </Dialog>
  );
});

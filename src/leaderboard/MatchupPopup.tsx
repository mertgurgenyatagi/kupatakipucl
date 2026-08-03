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
import { TEAMS, teamCrestSrc } from "../predictions/teams";
import { TournamentPhase } from "../tournament/tournamentPhase";
import { useImagePreload } from "@/lib/useImagePreload";
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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const TEAM_CREST_URLS = TEAMS.map((team) => teamCrestSrc(team.id));

interface MatchupPopupProps {
  fixtureId: string | null;
  onOpenChange: (open: boolean) => void;
  phase: TournamentPhase;
  tournamentStarted: boolean;
  entries: LeaderboardEntry[];
  players: Player[];
  results: Record<string, TeamResult>;
  onSelectTeam: (teamId: string) => void;
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

const NOT_STARTED_MESSAGE = "Turnuva başlamadan bu bilgi görüntülenemez.";
const KNOCKOUT_NOT_BUILT_MESSAGE = "Bu özellik henüz mevcut değil.";

function Placeholder({ message }: { message: string }) {
  return (
    <p className="flex h-full items-center justify-center px-3 text-center font-display text-xs text-color_textsecondary italic">
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

function computeTeamAverage(teamId: string, entries: LeaderboardEntry[]): number | null {
  let sum = 0;
  let count = 0;
  entries.forEach((e) => {
    const pos = e.ranking.indexOf(teamId);
    if (pos !== -1) {
      sum += pos + 1;
      count += 1;
    }
  });
  return count > 0 ? Math.round((sum / count) * 10) / 10 : null;
}

function MatchupCenter({ fixture, outcome }: { fixture: Fixture; outcome: MatchOutcome }) {
  const kickoff = new Date(fixture.kickoffUtc);
  if (outcome === "notplayed") {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-color_border1/50 bg-foreground/[0.04] px-5 py-2.5 shadow-sm">
        <span className="font-mono text-base sm:text-lg font-bold text-color_text uppercase tracking-wider tnum">
          {DATE_FMT.format(kickoff)}
        </span>
        <span className="font-mono text-xs sm:text-sm font-semibold text-color_textsecondary tnum">
          {TIME_FMT.format(kickoff)}
        </span>
      </div>
    );
  }
  const { homeGoals, awayGoals } = goalsForOutcome(outcome);
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-color_border1/50 bg-foreground/[0.04] px-6 py-2.5 shadow-sm">
      <span className="font-mono text-3xl sm:text-4xl font-black tracking-tight text-color_text tnum">
        {homeGoals} - {awayGoals}
      </span>
      <span className="font-mono text-xs font-semibold text-color_textsecondary tnum">
        {DATE_FMT.format(kickoff)}
      </span>
    </div>
  );
}

/** Predictor row — compact height (30% smaller than previous), crisp avatar & predicted rank pill. */
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
      <p className="px-3 py-4 font-display text-xs text-color_textsecondary italic text-center">
        Bu takımı tahmin eden katılımcı yok.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      {predictors.map((p) => {
        const pName = fullName({
          firstName: p.entry.firstName,
          lastName: playersByUid.get(p.entry.uid)?.lastName,
        });
        const pInitials = sharedInitials({
          firstName: p.entry.firstName,
          lastName: playersByUid.get(p.entry.uid)?.lastName,
        });

        return (
          <button
            key={p.entry.uid}
            type="button"
            onClick={() => onSelectParticipant(p.entry.uid)}
            className={cn(
              "group flex w-full cursor-pointer items-center gap-2 rounded-lg border border-color_border1/30 bg-background/80 px-2.5 py-1.5 text-left transition-all duration-150 ease-[var(--ease-cotton)] hover:border-color_border1 hover:bg-color_hoverfill hover:shadow-sm",
              p.correct && "border-color_green/60 bg-color_green/[0.12]"
            )}
          >
            <Avatar className="size-7 shrink-0 ring-1 ring-color_border1/40">
              <AvatarImage src={p.entry.photoURL} alt="" />
              <AvatarFallback className="bg-color_accent/20 font-mono text-[0.65rem] font-semibold text-color_text">
                {pInitials}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1 truncate font-display text-xs font-semibold text-color_text group-hover:underline">
              {pName}
            </span>
            <span className="shrink-0 font-mono text-xs sm:text-sm font-normal text-color_textsecondary tnum">
              {p.predictedPosition}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function TeamColumn({
  teamId,
  entries,
  isKnockoutFixture,
  tournamentStarted,
  predictors,
  playersByUid,
  onSelectParticipant,
}: {
  teamId: string;
  entries: LeaderboardEntry[];
  isKnockoutFixture: boolean;
  tournamentStarted: boolean;
  predictors: TeamPredictor[];
  playersByUid: Map<string, Player>;
  onSelectParticipant: (uid: string) => void;
}) {
  const avg = useMemo(() => computeTeamAverage(teamId, entries), [teamId, entries]);

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-color_border1/50 bg-background/60 p-3 shadow-sm">
      <div className="flex items-center justify-between border-b border-color_border1/30 pb-2 mb-2 px-2.5">
        <span className="font-display text-xs font-bold text-color_text uppercase tracking-wider">
          Ortalama Sıra
        </span>
        <span className="font-mono text-sm sm:text-base font-extrabold text-color_gold tnum">
          {avg !== null ? avg : "-"}
        </span>
      </div>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pr-0.5">
        {!tournamentStarted ? (
          <Placeholder message={NOT_STARTED_MESSAGE} />
        ) : isKnockoutFixture ? (
          <Placeholder message={KNOCKOUT_NOT_BUILT_MESSAGE} />
        ) : (
          <PredictorList
            predictors={predictors}
            playersByUid={playersByUid}
            onSelectParticipant={onSelectParticipant}
          />
        )}
      </div>
    </div>
  );
}

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

  const [lastFixtureId, setLastFixtureId] = useState<string | null>(null);
  useEffect(() => {
    if (fixtureId) setLastFixtureId(fixtureId);
  }, [fixtureId]);

  const displayedId = fixtureId ?? lastFixtureId;
  const fixture = displayedId ? (FIXTURES.find((f) => f.id === displayedId) ?? null) : null;
  const isKnockoutFixture = fixture !== null && !FIXTURES.includes(fixture);

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

  const headerLabel = fixture ? (isKnockoutFixture ? "ELEME TURU" : `${fixture.matchday}. HAFTA`) : "";

  const popupImageUrls = useMemo(
    () => (fixture ? [...entries.map((e) => e.photoURL).filter(Boolean), ...TEAM_CREST_URLS] : []),
    [fixture, entries]
  );
  const popupImagesReady = useImagePreload(popupImageUrls);

  const homeResult = home ? results[home.id] : undefined;
  const awayResult = away ? results[away.id] : undefined;

  return (
    <Dialog open={fixtureId !== null} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-[calc(100%-2rem)] gap-0 rounded-none bg-transparent p-0 ring-0 sm:max-w-3xl"
      >
        {fixture && home && away && !popupImagesReady && (
          <Frame
            className="h-[min(88vh,48rem)] w-full animate-cotton-rise border-color_border1/40 rounded-2xl shadow-2xl"
            aria-hidden
            data-testid="matchup-popup-skeleton"
          >
            <div className="flex h-full flex-col gap-3 p-4">
              <Skeleton className="h-16 w-full shrink-0 rounded-xl" />
              <Skeleton className="min-h-0 flex-1 rounded-xl" />
            </div>
          </Frame>
        )}
        {fixture && home && away && popupImagesReady && (
          <Frame className="h-[min(88vh,48rem)] max-h-[min(88vh,48rem)] w-full animate-cotton-rise border-color_border1/40 rounded-2xl shadow-2xl flex flex-col min-h-0">
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

            <FrameBody className="min-h-0 flex-1 flex flex-col gap-4 p-4 sm:p-5 overflow-hidden">
              {/* TOP 33% SECTION: Team Info & Matchup Display */}
              <div className="h-[33%] shrink-0 flex items-center justify-between rounded-2xl border border-color_border1/50 bg-foreground/[0.02] p-4 sm:p-5 shadow-sm">
                {/* Home Team */}
                <button
                  type="button"
                  onClick={() => onSelectTeam(home.id)}
                  className="group flex flex-1 flex-col items-center justify-center gap-1.5 cursor-pointer text-center min-w-0"
                >
                  <TeamCrest teamId={home.id} className="size-14 sm:size-16 shrink-0 transition-transform duration-200 group-hover:scale-105" />
                  <span className="truncate font-display text-base sm:text-lg font-bold text-color_text group-hover:underline">
                    {home.name}
                  </span>
                  <div className="flex items-center gap-2 font-mono text-xs sm:text-sm text-color_textsecondary">
                    <span>Sıra: <strong className="text-color_gold text-sm sm:text-base font-extrabold">{tournamentStarted && homeResult ? `#${homeResult.position}` : "-"}</strong></span>
                    <span>•</span>
                    <span>Puan: <strong className="text-color_text text-sm sm:text-base font-extrabold">{tournamentStarted && homeResult ? homeResult.points : "-"}</strong></span>
                  </div>
                </button>

                {/* Match Center */}
                <div className="shrink-0 px-3">
                  <MatchupCenter fixture={fixture} outcome={outcome} />
                </div>

                {/* Away Team */}
                <button
                  type="button"
                  onClick={() => onSelectTeam(away.id)}
                  className="group flex flex-1 flex-col items-center justify-center gap-1.5 cursor-pointer text-center min-w-0"
                >
                  <TeamCrest teamId={away.id} className="size-14 sm:size-16 shrink-0 transition-transform duration-200 group-hover:scale-105" />
                  <span className="truncate font-display text-base sm:text-lg font-bold text-color_text group-hover:underline">
                    {away.name}
                  </span>
                  <div className="flex items-center gap-2 font-mono text-xs sm:text-sm text-color_textsecondary">
                    <span>Sıra: <strong className="text-color_gold text-sm sm:text-base font-extrabold">{tournamentStarted && awayResult ? `#${awayResult.position}` : "-"}</strong></span>
                    <span>•</span>
                    <span>Puan: <strong className="text-color_text text-sm sm:text-base font-extrabold">{tournamentStarted && awayResult ? awayResult.points : "-"}</strong></span>
                  </div>
                </button>
              </div>

              {/* BOTTOM 67% SECTION: Predictions Columns */}
              {phase !== "notstarted" && (
                <div className="h-[67%] min-h-0 flex-1 grid grid-cols-2 gap-4">
                  <TeamColumn
                    teamId={home.id}
                    entries={entries}
                    isKnockoutFixture={isKnockoutFixture}
                    tournamentStarted={tournamentStarted}
                    predictors={homePredictors}
                    playersByUid={playersByUid}
                    onSelectParticipant={onSelectParticipant}
                  />
                  <TeamColumn
                    teamId={away.id}
                    entries={entries}
                    isKnockoutFixture={isKnockoutFixture}
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

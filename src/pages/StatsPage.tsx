// src/pages/StatsPage.tsx
import { useVisibilityState } from "../state/useVisibilityState";
import { isPageAllowed } from "../state/pageAccess";
import { useLeaderboard } from "../leaderboard/useLeaderboard";
import { useResults } from "../leaderboard/useResults";
import { usePlayers, Player } from "../profile/usePlayers";
import { useSurveyResponses, SurveyResponseEntry } from "../predictions/useSurveyResponses";
import { LeaderboardEntry } from "../leaderboard/leaderboardTypes";
import { TeamResult } from "../leaderboard/teamResultTypes";
import { computeTeamBias } from "../stats/teamBias";
import { computeTeamAgreement } from "../stats/teamAgreement";
import { computeAgeDistribution } from "../stats/ageBuckets";
import {
  computeFootballKnowledgeDistribution,
  computeMessiRonaldoDistribution,
  computeSuperLigDistribution,
} from "../stats/surveyAggregates";
import { RankedStatList, RankedRow } from "../stats/RankedStatList";
import { BarChartWidget } from "../stats/BarChartWidget";
import { NumberBox } from "../stats/NumberBox";
import { STAT_WIDGETS } from "../leaderboard/StatWidget";
import { Frame, FrameHeader, FrameTitle, FrameBody } from "@/components/ui/frame";

const PAGE_SHELL =
  "relative mx-auto flex w-full max-w-[1100px] min-w-0 flex-col gap-4 p-4 sm:p-6 lg:h-full lg:min-h-0 lg:flex-1 lg:gap-5 lg:p-6";
const MAIN_ROW =
  "relative z-10 grid min-w-0 gap-4 lg:h-full lg:min-h-0 lg:flex-1 lg:grid-cols-2 lg:gap-5 [&>*]:min-h-0 [&>*]:min-w-0";
const WIDGET_GRID = "grid min-h-0 flex-1 grid-cols-2 content-start gap-4 overflow-y-auto p-4";

// UCL supported-team survey answer is still free text (about to become a
// select — see docs/superpowers/specs/2026-07-23-stats-page-design.md's
// follow-ups); no real read is wired up for it yet, so this widget runs on
// placeholder data, same spirit as StatWidget.tsx's existing dummy rows.
const UCL_TEAM_PLACEHOLDER = [
  { label: "Real Madrid", count: 9 },
  { label: "Barcelona", count: 7 },
  { label: "Arsenal", count: 5 },
  { label: "Galatasaray", count: 4 },
  { label: "Liverpool", count: 2 },
];

function formatSigned(value: number): string {
  return (value > 0 ? "+" : "") + value.toFixed(1);
}

interface StatsPageViewProps {
  entries: LeaderboardEntry[];
  results: Record<string, TeamResult>;
  players: Player[];
  responses: SurveyResponseEntry[];
}

/**
 * The actual page composition, taking its data as props rather than
 * fetching it — same split as TeamPopup/ParticipantPopup (hooks live in
 * the routed page, the view itself is just props in, JSX out). This is
 * what devpanel/StatsPageTuner.tsx renders directly with fake data, so a
 * preview is guaranteed pixel-identical to the real page by construction,
 * not by rebuilding a lookalike.
 */
export function StatsPageView({ entries, results, players, responses }: StatsPageViewProps) {
  const rankings = entries.map((entry) => entry.ranking);

  const bias = computeTeamBias(rankings, results);
  const overperformers = bias.slice(0, 3);
  const underperformers = bias.slice(-3).reverse();

  const agreement = computeTeamAgreement(rankings);
  const mostAgreed = agreement.slice(0, 3);
  const mostDisagreed = agreement.slice(-3).reverse();

  const overperformerRows: RankedRow[] = overperformers.map((t) => ({
    key: t.teamId,
    name: t.teamName,
    value: formatSigned(t.averageDifference),
    teamId: t.teamId,
  }));
  const underperformerRows: RankedRow[] = underperformers.map((t) => ({
    key: t.teamId,
    name: t.teamName,
    value: formatSigned(t.averageDifference),
    teamId: t.teamId,
  }));
  const agreedRows: RankedRow[] = mostAgreed.map((t) => ({
    key: t.teamId,
    name: t.teamName,
    value: t.spread.toFixed(1),
    teamId: t.teamId,
  }));
  const disagreedRows: RankedRow[] = mostDisagreed.map((t) => ({
    key: t.teamId,
    name: t.teamName,
    value: t.spread.toFixed(1),
    teamId: t.teamId,
  }));

  const ageBars = computeAgeDistribution(responses.map((r) => r.age));
  const knowledgeBars = computeFootballKnowledgeDistribution(responses.map((r) => r.footballKnowledge));
  const messiRonaldoBars = computeMessiRonaldoDistribution(responses.map((r) => r.messiOrRonaldo));
  const superLigBars = computeSuperLigDistribution(responses.map((r) => r.superLigTeam));

  return (
    <div className={PAGE_SHELL}>
      <div className={MAIN_ROW}>
        <Frame className="min-h-0 lg:h-full">
          <FrameHeader tone="navy">
            <FrameTitle className="text-navy-ink">Turnuva İstatistikleri</FrameTitle>
          </FrameHeader>
          <FrameBody className={WIDGET_GRID}>
            {STAT_WIDGETS.map((spec) => (
              <RankedStatList
                key={spec.key}
                label={spec.title}
                rows={spec.rows.map((row, i) => ({ key: `${spec.key}-${i}`, ...row }))}
              />
            ))}
            <RankedStatList label="Beklenti Üstü" rows={overperformerRows} />
            <RankedStatList label="Beklenti Altı" rows={underperformerRows} />
            <RankedStatList label="Hemfikir Olunanlar" rows={agreedRows} />
            <RankedStatList label="Tartışmalı Takımlar" rows={disagreedRows} />
          </FrameBody>
        </Frame>
        <Frame className="min-h-0 lg:h-full">
          <FrameHeader tone="navy">
            <FrameTitle className="text-navy-ink">Katılımcı İstatistikleri</FrameTitle>
          </FrameHeader>
          <FrameBody className={WIDGET_GRID}>
            <NumberBox label="Katılımcı Sayısı" value={players.length} />
            <BarChartWidget label="Yaş" bars={ageBars} />
            <BarChartWidget label="Futbol Bilgisi" bars={knowledgeBars} />
            <BarChartWidget label="Messi mi Ronaldo mu?" bars={messiRonaldoBars} />
            <BarChartWidget label="Süper Lig Takımı" bars={superLigBars} />
            <BarChartWidget label="UCL Takımı" bars={UCL_TEAM_PLACEHOLDER} />
          </FrameBody>
        </Frame>
      </div>
    </div>
  );
}

export function StatsPage() {
  const state = useVisibilityState();
  const { entries, loading: leaderboardLoading } = useLeaderboard();
  const { results, loading: resultsLoading } = useResults();
  const { players, loading: playersLoading } = usePlayers();
  const { responses, loading: responsesLoading } = useSurveyResponses();

  if (!isPageAllowed("stats", state)) {
    return (
      <div className="flex h-full flex-1 items-center px-5 sm:px-8 lg:px-12">
        <p className="font-display text-2xl text-muted-foreground italic">
          This section isn't available right now.
        </p>
      </div>
    );
  }

  if (leaderboardLoading || resultsLoading || playersLoading || responsesLoading) return null;

  return <StatsPageView entries={entries} results={results} players={players} responses={responses} />;
}

import { useMemo, useState } from "react";
import { StatsPageView } from "../pages/StatsPage";
import { TEAMS } from "../predictions/teams";
import { LeaderboardEntry } from "../leaderboard/leaderboardTypes";
import { TeamResult } from "../leaderboard/teamResultTypes";
import { Player } from "../profile/usePlayers";
import { SurveyResponseEntry } from "../predictions/useSurveyResponses";
import { MessiOrRonaldo } from "../predictions/surveyTypes";

function rotate<T>(arr: T[], offset: number): T[] {
  const n = arr.length;
  return arr.map((_, i) => arr[(i + offset) % n]);
}

// Fixed, not tied to the slider below — 15 full-length predicted rankings,
// each a different rotation of the real team list, against results that
// just follow TEAMS' own order. That mismatch is what gives the
// overperformer/underperformer/agreed/disagreed widgets real, varied
// numbers instead of degenerate all-zero ones.
const FAKE_ENTRIES: LeaderboardEntry[] = Array.from({ length: 15 }, (_, i) => ({
  uid: `fake-entry-${i}`,
  firstName: "Katılımcı",
  lastName: `${i + 1}`,
  photoURL: "",
  points: 30 - i,
  ranking: rotate(TEAMS, i * 3).map((t) => t.id),
}));

const FAKE_RESULTS: Record<string, TeamResult> = Object.fromEntries(
  TEAMS.map((team, i) => [
    team.id,
    { position: i + 1, points: 34 - i, goalDifference: 20 - i, goalsFor: 30, goalsAgainst: 10 + i, matchesPlayed: 8 },
  ])
);

const SUPER_LIG_OPTIONS = ["Galatasaray", "Fenerbahçe", "Beşiktaş", "Trabzonspor", "Anadolu takımı", "Yok"];
const MESSI_RONALDO_OPTIONS: MessiOrRonaldo[] = ["messi", "ronaldo", "no-opinion"];

// This is the actual variable that exposed the row-collapse bug: the right
// column's bar widgets only get tall enough to collide with the row below
// once there's a realistic number of responses. Slider-driven so the same
// scenario is reproducible on demand instead of needing a real signed-in
// session with real seeded data.
function generateResponses(count: number): SurveyResponseEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    uid: `fake-response-${i}`,
    age: 18 + (i % 15),
    footballKnowledge: (i % 7) + 1,
    messiOrRonaldo: MESSI_RONALDO_OPTIONS[i % MESSI_RONALDO_OPTIONS.length],
    superLigTeam: SUPER_LIG_OPTIONS[i % SUPER_LIG_OPTIONS.length],
    uclTeam: null,
    device: "both",
    submittedAt: 1,
  }));
}

function generatePlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    uid: `fake-player-${i}`,
    firstName: "Katılımcı",
    lastName: `${i + 1}`,
    photoURL: "",
    createdAt: i,
  }));
}

/**
 * Dev-only preview for StatsPage.tsx — renders the *actual* StatsPageView
 * (not a rebuilt lookalike) with adjustable fake data, same "core fix, not
 * micromanaging" reasoning as TeamPopupTuner.tsx: a preview only proves
 * anything if it's guaranteed pixel-identical to the real page, which only
 * happens when it's the same component. StatsPage's own visibility gate
 * needs a real signed-in, tournament-started session to reach at all, and
 * the survey-based widgets need real Firestore data on top of that — this
 * page sidesteps both by rendering StatsPageView directly with data as
 * props, the same split LeaderboardPage/TeamPopup already use.
 *
 * Gated behind `import.meta.env.DEV` in App.tsx, same as `/dev` itself —
 * inert in production.
 */
export function StatsPageTuner() {
  const [count, setCount] = useState(51);
  const responses = useMemo(() => generateResponses(count), [count]);
  const players = useMemo(() => generatePlayers(count), [count]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-ink">
      <div className="flex shrink-0 flex-wrap items-center gap-4 border-b border-border bg-card px-4 py-3">
        <label className="flex items-center gap-2 text-sm">
          Katılımcı sayısı
          <input
            type="range"
            min={0}
            max={80}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-48 accent-brass"
          />
          <span className="w-6 font-mono text-xs text-brass tnum">{count}</span>
        </label>
        <p className="text-xs text-muted-foreground">
          Bu, StatsPage.tsx'in gerçek görünümü — kopyası değil. Pencereyi küçültüp kaydırma davranışını test edin.
        </p>
      </div>
      <div className="min-h-0 flex-1">
        <StatsPageView entries={FAKE_ENTRIES} results={FAKE_RESULTS} players={players} responses={responses} />
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { StatsPageView } from "../pages/StatsPage";
import { TEAMS } from "../predictions/teams";
import { LeaderboardEntry } from "../leaderboard/leaderboardTypes";
import { TeamResult } from "../leaderboard/teamResultTypes";
import { Player } from "../profile/usePlayers";
import { SurveyResponseEntry } from "../predictions/useSurveyResponses";
import { MessiOrRonaldo } from "../predictions/surveyTypes";
import { StatsPageTuning, DEFAULT_STATS_PAGE_TUNING } from "../stats/statsPageTuning";

function rotate<T>(arr: T[], offset: number): T[] {
  const n = arr.length;
  return arr.map((_, i) => arr[(i + offset) % n]);
}

// Fixed, not tied to the participant-count slider below — 15 full-length
// predicted rankings, each a different rotation of the real team list,
// against results that just follow TEAMS' own order. That mismatch is what
// gives the overperformer/underperformer/agreed/disagreed widgets real,
// varied numbers instead of degenerate all-zero ones.
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

// Must match SurveyForm.tsx's real SUPER_LIG_TEAMS exactly — this is a
// fixed dropdown, not free text, so a fake option that couldn't actually be
// submitted would misrepresent the real widget.
const SUPER_LIG_OPTIONS = ["Galatasaray", "Fenerbahçe", "Beşiktaş", "Trabzonspor", "Anadolu takımı", "Yok"];
const MESSI_RONALDO_OPTIONS: MessiOrRonaldo[] = ["messi", "ronaldo", "no-opinion"];
// Cycled rather than a wide range so all 5 age buckets (<18, 18-20, 21-25,
// 26-30, >30 — see stats/ageBuckets.ts) get real coverage regardless of
// participant count, instead of leaving the youngest bucket empty.
const AGE_SAMPLES = [15, 17, 18, 19, 20, 22, 24, 25, 27, 30, 32, 35];

// Participant count is the actual variable that exposed the row-collapse
// bug: the right column's bar widgets only get tall enough to collide with
// the row below once there's a realistic number of responses. Slider-driven
// so that scenario (and anything like it) is reproducible on demand instead
// of needing a real signed-in session with real seeded data.
function generateResponses(count: number): SurveyResponseEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    uid: `fake-response-${i}`,
    age: AGE_SAMPLES[i % AGE_SAMPLES.length],
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

function fieldsOf() {
  return [
    { group: "Sütunlar", key: "columnGap", label: "İki çerçeve arası boşluk", min: 0.5, max: 3, step: 0.05, unit: "rem" },
    { group: "Sütunlar", key: "widgetGap", label: "Widget'lar arası boşluk", min: 0.25, max: 2.5, step: 0.05, unit: "rem" },
    { group: "Sütunlar", key: "gridPadding", label: "Çerçeve iç boşluğu", min: 0.25, max: 2.5, step: 0.05, unit: "rem" },
    { group: "Ortak", key: "labelFontSize", label: "Başlık yazı boyutu", min: 0.5, max: 1.2, step: 0.02, unit: "rem" },
    { group: "Sıralı liste", key: "rowAvatar", label: "Avatar / arma boyutu", min: 1, max: 3, step: 0.05, unit: "rem" },
    { group: "Sıralı liste", key: "rowPy", label: "Satır dikey boşluğu", min: 0.1, max: 1.2, step: 0.02, unit: "rem" },
    { group: "Sıralı liste", key: "rowFontSize", label: "İsim / değer yazı boyutu", min: 0.5, max: 1.4, step: 0.02, unit: "rem" },
    { group: "Çubuk grafik", key: "barHeight", label: "Çubuk kalınlığı", min: 0.25, max: 2, step: 0.05, unit: "rem" },
    { group: "Çubuk grafik", key: "barRowGap", label: "Çubuklar arası boşluk", min: 0.1, max: 1.5, step: 0.02, unit: "rem" },
    { group: "Çubuk grafik", key: "barFontSize", label: "Etiket yazı boyutu", min: 0.5, max: 1.2, step: 0.02, unit: "rem" },
    { group: "Çubuk grafik", key: "barLabelWidth", label: "Etiket sütunu genişliği (satırın yüzdesi)", min: 10, max: 50, step: 1, unit: "%" },
    { group: "Sayı kutusu", key: "numberFontSize", label: "Büyük sayı boyutu", min: 1, max: 4.5, step: 0.1, unit: "rem" },
  ] as const;
}

function formatExport(t: StatsPageTuning): string {
  const keys = Object.keys(t) as (keyof StatsPageTuning)[];
  const lines = keys.map((k) => {
    const v = t[k];
    return `  ${k}: ${typeof v === "string" ? `"${v}"` : v},`;
  });
  return `export const DEFAULT_STATS_PAGE_TUNING: StatsPageTuning = {\n${lines.join("\n")}\n};`;
}

/**
 * Dev-only tuning page for the stats page — renders the *actual*
 * StatsPageView (not a rebuilt lookalike) with every layout constant it's
 * built to accept via its `tuning` prop exposed as a slider, same "core
 * fix, not micromanaging" reasoning as TeamPopupTuner.tsx. StatsPage's own
 * visibility gate needs a real signed-in, tournament-started session to
 * reach at all, and the survey-based widgets need real Firestore data on
 * top of that — this page sidesteps both by rendering StatsPageView
 * directly with data as props, the same split LeaderboardPage/TeamPopup
 * already use.
 *
 * Gated behind `import.meta.env.DEV` in App.tsx, same as `/dev` itself —
 * inert in production.
 */
export function StatsPageTuner() {
  const [tuning, setTuning] = useState<StatsPageTuning>(DEFAULT_STATS_PAGE_TUNING);
  const [count, setCount] = useState(51);
  const [copied, setCopied] = useState(false);

  const responses = useMemo(() => generateResponses(count), [count]);
  const players = useMemo(() => generatePlayers(count), [count]);

  function set<K extends keyof StatsPageTuning>(key: K, value: StatsPageTuning[K]) {
    setTuning((prev) => ({ ...prev, [key]: value }));
  }

  async function handleExport() {
    const text = formatExport(tuning);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard permission can be denied in some contexts — the export
      // still lands in the console so it's never truly stuck.
      console.log(text);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const groups = Array.from(new Set(fieldsOf().map((f) => f.group)));

  return (
    <div className="flex h-full min-h-0 bg-background text-ink">
      <div className="no-scrollbar w-[320px] shrink-0 overflow-y-auto border-r border-border bg-card p-4">
        <h1 className="font-display text-base font-bold text-ink">Stats Page Tuner</h1>
        <p className="mt-1 mb-5 text-xs text-muted-foreground">
          Bu, StatsPage.tsx'in kendisi — kopyası değil. Sürükle, sonra "Değerleri kopyala"ya bas.
        </p>

        <div className="mb-5">
          <h2 className="mb-2 border-b border-border/60 pb-1.5 font-mono text-[0.62rem] tracking-[0.18em] text-muted-foreground uppercase">
            Veri
          </h2>
          <label className="mb-1 flex items-baseline justify-between text-xs">
            <span>Katılımcı sayısı</span>
            <span className="font-mono text-[0.68rem] text-brass tnum">{count}</span>
          </label>
          <input
            type="range"
            min={0}
            max={80}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-full accent-brass"
          />
          <p className="mt-1.5 text-[0.68rem] text-muted-foreground">
            Sağ sütunun widget'ları bu sayıya göre büyür — satır çakışması gibi hataları burada yakala.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setTuning(DEFAULT_STATS_PAGE_TUNING)}
          className="mb-5 cursor-pointer text-xs text-muted-foreground underline hover:text-ink"
        >
          Mevcut sürüme sıfırla
        </button>

        {groups.map((group) => (
          <div key={group} className="mb-5">
            <h2 className="mb-2 border-b border-border/60 pb-1.5 font-mono text-[0.62rem] tracking-[0.18em] text-muted-foreground uppercase">
              {group}
            </h2>
            {fieldsOf()
              .filter((f) => f.group === group)
              .map((f) => (
                <div key={f.key} className="mb-3">
                  <label className="mb-1 flex items-baseline justify-between text-xs">
                    <span>{f.label}</span>
                    <span className="font-mono text-[0.68rem] text-brass tnum">
                      {tuning[f.key]}
                      {f.unit}
                    </span>
                  </label>
                  <input
                    type="range"
                    min={f.min}
                    max={f.max}
                    step={f.step}
                    value={tuning[f.key] as number}
                    onChange={(e) => set(f.key, parseFloat(e.target.value) as never)}
                    className="w-full accent-brass"
                  />
                </div>
              ))}
          </div>
        ))}

        <div className="mb-5">
          <h2 className="mb-2 border-b border-border/60 pb-1.5 font-mono text-[0.62rem] tracking-[0.18em] text-muted-foreground uppercase">
            Çubuk rengi
          </h2>
          <input
            type="color"
            value={tuning.barFill}
            onChange={(e) => set("barFill", e.target.value)}
            className="h-8 w-full cursor-pointer rounded border border-border bg-transparent"
          />
        </div>

        <button
          type="button"
          onClick={handleExport}
          className="w-full cursor-pointer rounded-lg bg-brass px-3 py-2.5 font-display text-sm font-semibold text-navy-ink transition-opacity hover:opacity-90"
        >
          {copied ? "Kopyalandı — buraya yapıştır" : "Değerleri kopyala"}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <StatsPageView
          entries={FAKE_ENTRIES}
          results={FAKE_RESULTS}
          players={players}
          responses={responses}
          tuning={tuning}
        />
      </div>
    </div>
  );
}

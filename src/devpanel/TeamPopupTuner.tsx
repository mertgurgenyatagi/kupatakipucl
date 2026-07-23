import { useState } from "react";
import { createPortal } from "react-dom";
import { TeamPopup } from "../leaderboard/TeamPopup";
import { TeamPopupTuning, DEFAULT_TEAM_POPUP_TUNING } from "../leaderboard/teamPopupTuning";
import { TEAMS } from "../predictions/teams";
import { LeaderboardEntry } from "../leaderboard/leaderboardTypes";
import { TeamResult } from "../leaderboard/teamResultTypes";

const TEAM = TEAMS[0];
const OTHER_TEAMS = TEAMS.slice(1, 6);

// Enough fake participants, at a spread of predicted positions and real
// point totals, to populate a realistic "who predicted this team" list and
// exercise its scroll/correctness behavior — same spirit as the fixtures
// used in TeamPopup.test.tsx, just more of them for a fuller preview.
const FAKE_ENTRIES: LeaderboardEntry[] = [
  { uid: "u1", firstName: "Pınar", lastName: "Doğan", photoURL: "", points: 24, ranking: [TEAM.id, ...OTHER_TEAMS.map((t) => t.id)] },
  { uid: "u2", firstName: "İbrahim", lastName: "Polat", photoURL: "", points: 21, ranking: [OTHER_TEAMS[0].id, TEAM.id, ...OTHER_TEAMS.slice(1).map((t) => t.id)] },
  { uid: "u3", firstName: "Ali", lastName: "Kurt", photoURL: "", points: 18, ranking: [...OTHER_TEAMS.slice(0, 2).map((t) => t.id), TEAM.id, ...OTHER_TEAMS.slice(2).map((t) => t.id)] },
  { uid: "u4", firstName: "Ahmet", lastName: "Yılmaz", photoURL: "", points: 15, ranking: [...OTHER_TEAMS.map((t) => t.id), TEAM.id] },
  { uid: "u5", firstName: "Ali", lastName: "Çelik", photoURL: "", points: 12, ranking: [TEAM.id, ...OTHER_TEAMS.map((t) => t.id)] },
  { uid: "u6", firstName: "Kaan", lastName: "Aslan", photoURL: "", points: 9, ranking: [...OTHER_TEAMS.slice(0, 3).map((t) => t.id), TEAM.id, ...OTHER_TEAMS.slice(3).map((t) => t.id)] },
  { uid: "u7", firstName: "Burak", lastName: "Yılmaz", photoURL: "", points: 6, ranking: [...OTHER_TEAMS.map((t) => t.id), TEAM.id] },
];

const FAKE_RESULTS: Record<string, TeamResult> = {
  [TEAM.id]: { position: 1, points: 3, goalDifference: 1, goalsFor: 1, goalsAgainst: 0, matchesPlayed: 1 },
};

function fieldsOf() {
  return [
    { group: "Sütunlar", key: "col1", label: "Saha sütunu", min: 1, max: 4, step: 0.05, unit: "fr" },
    { group: "Sütunlar", key: "col2", label: "İstatistik sütunu", min: 0.5, max: 3, step: 0.05, unit: "fr" },
    { group: "Sütunlar", key: "col3", label: "Sağ sütun", min: 0.5, max: 3, step: 0.05, unit: "fr" },
    { group: "Sütunlar", key: "gridGap", label: "Sütunlar arası boşluk", min: 0.5, max: 2.5, step: 0.05, unit: "rem" },
    { group: "Başlık", key: "crestSize", label: "Arma boyutu", min: 2, max: 5, step: 0.1, unit: "rem" },
    { group: "Başlık", key: "headerGap", label: "İsim → sıra/puan boşluğu", min: 1, max: 8, step: 0.1, unit: "rem" },
    { group: "Başlık", key: "rankPtsSize", label: "Sıra/puan yazı boyutu", min: 1, max: 4.5, step: 0.1, unit: "rem" },
    { group: "Saha", key: "markerRadius", label: "Oyuncu ikon boyutu", min: 8, max: 45, step: 1, unit: "px" },
    { group: "Saha", key: "markerFontSize", label: "Oyuncu adı boyutu", min: 6, max: 22, step: 0.5, unit: "px" },
    { group: "Satırlar (paylaşılan sabit)", key: "rowAvatar", label: "Avatar / arma boyutu", min: 1, max: 3, step: 0.05, unit: "rem" },
    { group: "Satırlar (paylaşılan sabit)", key: "rowPy", label: "Dikey boşluk", min: 0.1, max: 1.2, step: 0.02, unit: "rem" },
    { group: "Satırlar (paylaşılan sabit)", key: "rowGap", label: "Satır içi boşluk", min: 0.2, max: 1.5, step: 0.02, unit: "rem" },
    { group: "Satırlar (paylaşılan sabit)", key: "fsName", label: "İsim yazı boyutu", min: 0.5, max: 1.4, step: 0.02, unit: "rem" },
    { group: "Satırlar (paylaşılan sabit)", key: "fsValue", label: "Değer yazı boyutu", min: 0.5, max: 1.2, step: 0.02, unit: "rem" },
    { group: "Maç satırları", key: "matchRowHeight", label: "Satır yüksekliği", min: 2.5, max: 8, step: 0.1, unit: "rem" },
  ] as const;
}

function formatExport(t: TeamPopupTuning): string {
  const keys = Object.keys(t) as (keyof TeamPopupTuning)[];
  const lines = keys.map((k) => {
    const v = t[k];
    return `  ${k}: ${typeof v === "string" ? `"${v}"` : v},`;
  });
  return `export const DEFAULT_TEAM_POPUP_TUNING: TeamPopupTuning = {\n${lines.join("\n")}\n};`;
}

/**
 * Dev-only tuning page for TeamPopup.tsx — renders the *actual* component
 * (not a rebuilt lookalike), with every layout constant it's built to
 * accept via its `tuning` prop exposed as a slider. This is the direct fix
 * for a lookalike artifact never being guaranteed pixel-identical to the
 * real thing: there's only one implementation here, so the tuner and the
 * live app are the same code by construction, not by careful copying.
 *
 * Gated behind `import.meta.env.DEV` in App.tsx, same as `/dev` itself —
 * inert in production.
 */
export function TeamPopupTuner() {
  const [tuning, setTuning] = useState<TeamPopupTuning>(DEFAULT_TEAM_POPUP_TUNING);
  const [copied, setCopied] = useState(false);

  function set<K extends keyof TeamPopupTuning>(key: K, value: TeamPopupTuning[K]) {
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

  // The Dialog's own backdrop/content is portaled straight to
  // `document.body` (base-ui's FloatingPortal), at z-50 — a sidebar
  // nested normally inside this page's own React tree sits in a *different*
  // stacking context, so no z-index on it can reliably win against that
  // portal (this was the actual bug: the sidebar rendered, but dimmed under
  // the backdrop and unreachable by clicks). Portaling the sidebar to
  // `document.body` too, at a higher z-index, makes it a genuine sibling of
  // the dialog's own portal content so the stacking comparison is real.
  const sidebar = (
    <div
      className="no-scrollbar fixed inset-y-0 left-0 z-[999] w-[340px] overflow-y-auto border-r border-border bg-card p-4 text-ink"
    >
        <h1 className="font-display text-base font-bold text-ink">Team Popup Tuner</h1>
        <p className="mt-1 mb-5 text-xs text-muted-foreground">
          Bu, TeamPopup.tsx'in kendisi — kopyası değil. Sürükle, sonra "Değerleri kopyala"ya bas.
        </p>

        <button
          type="button"
          onClick={() => setTuning(DEFAULT_TEAM_POPUP_TUNING)}
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
            Saha rengi
          </h2>
          <input
            type="color"
            value={tuning.pitchFill}
            onChange={(e) => set("pitchFill", e.target.value)}
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
  );

  return (
    <div className="flex h-full min-h-0 bg-background text-ink">
      {createPortal(sidebar, document.body)}

      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto p-8 pl-[calc(340px+2rem)]">
        <TeamPopup
          teamId={TEAM.id}
          entries={FAKE_ENTRIES}
          results={FAKE_RESULTS}
          onOpenChange={() => {}}
          onSelectParticipant={() => {}}
          onSelectTeam={() => {}}
          tuning={tuning}
        />
      </div>
    </div>
  );
}

import { MessiOrRonaldo } from "../predictions/surveyTypes";

export interface CountBar {
  label: string;
  count: number;
}

const FOOTBALL_KNOWLEDGE_LEVELS = [1, 2, 3, 4, 5, 6, 7];

export function computeFootballKnowledgeDistribution(levels: number[]): CountBar[] {
  const counts = new Map<number, number>(FOOTBALL_KNOWLEDGE_LEVELS.map((level) => [level, 0]));
  levels.forEach((level) => {
    counts.set(level, (counts.get(level) ?? 0) + 1);
  });
  return FOOTBALL_KNOWLEDGE_LEVELS.map((level) => ({
    label: String(level),
    count: counts.get(level) ?? 0,
  }));
}

const MESSI_OR_RONALDO_OPTIONS: MessiOrRonaldo[] = ["messi", "ronaldo", "no-opinion"];
const MESSI_OR_RONALDO_LABELS: Record<MessiOrRonaldo, string> = {
  messi: "Messi",
  ronaldo: "Ronaldo",
  "no-opinion": "Fikrim yok",
};

export function computeMessiRonaldoDistribution(picks: MessiOrRonaldo[]): CountBar[] {
  const counts = new Map<MessiOrRonaldo, number>(MESSI_OR_RONALDO_OPTIONS.map((o) => [o, 0]));
  picks.forEach((pick) => {
    counts.set(pick, (counts.get(pick) ?? 0) + 1);
  });
  return MESSI_OR_RONALDO_OPTIONS.map((pick) => ({
    label: MESSI_OR_RONALDO_LABELS[pick],
    count: counts.get(pick) ?? 0,
  }));
}

// Abbreviations for SurveyForm.tsx's fixed 6-option dropdown (SUPER_LIG_TEAMS)
// — bars need short labels to stay comparable at a narrow, fixed label-column
// width. Counting itself still happens on the raw answer, so this only
// affects display; an answer that isn't one of these 6 (e.g. real
// production data has legacy/edge-case free-text entries pre-dating the
// fixed dropdown) is shown as-is and just truncates like anything else.
const SUPER_LIG_ABBREVIATIONS: Record<string, string> = {
  Galatasaray: "GS",
  Fenerbahçe: "FB",
  Beşiktaş: "BJK",
  Trabzonspor: "TS",
  "Anadolu takımı": "Anadolu",
  Yok: "Yok",
};

export function computeSuperLigDistribution(teams: string[]): CountBar[] {
  const counts = new Map<string, number>();
  teams.forEach((team) => {
    counts.set(team, (counts.get(team) ?? 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([team, count]) => ({ label: SUPER_LIG_ABBREVIATIONS[team] ?? team, count }))
    .sort((a, b) => b.count - a.count);
}

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

export function computeSuperLigDistribution(teams: string[]): CountBar[] {
  const counts = new Map<string, number>();
  teams.forEach((team) => {
    counts.set(team, (counts.get(team) ?? 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

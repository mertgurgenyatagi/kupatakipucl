import { VisibilityState } from "./visibilityState";

export type PageKey = "predictions" | "leaderboard" | "chat" | "forum" | "stats";

const PAGE_ACCESS: Record<PageKey, VisibilityState[]> = {
  predictions: ["NST_LI", "ST_LI"],
  leaderboard: ["ST_NLI", "ST_LI"],
  chat: ["NST_LI", "ST_LI"],
  forum: ["NST_LI", "ST_NLI", "ST_LI"],
  stats: ["ST_NLI", "ST_LI"],
};

export function isPageAllowed(page: PageKey, state: VisibilityState): boolean {
  return PAGE_ACCESS[page].includes(state);
}

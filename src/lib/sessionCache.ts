// A plain in-memory, module-level cache (cleared on a full page reload,
// shared across every mount within the same session) — used by the
// one-shot data hooks (usePlayers, useLeaderboard, useResults, usePosts,
// usePostLikes, useProfile) so navigating back to a page you've already
// visited shows the last-known data immediately instead of flashing back
// to a loading/skeleton state while it refetches in the background.
const cache = new Map<string, unknown>();

export function getCached<T>(key: string): T | undefined {
  return cache.get(key) as T | undefined;
}

export function setCached<T>(key: string, value: T): void {
  cache.set(key, value);
}

export function deleteCached(key: string): void {
  cache.delete(key);
}

// Test-only: the cache is a module-level singleton by design (that's what
// makes it survive a page navigation), which means it also survives between
// `it()` blocks in the same test file unless cleared — call this from a
// beforeEach in any test that exercises a cached hook.
export function clearSessionCache(): void {
  cache.clear();
}

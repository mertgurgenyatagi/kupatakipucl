// src/pages/ForumPage.tsx
import { useAuth } from "../auth/AuthProvider";
import { useVisibilityState } from "../state/useVisibilityState";
import { isPageAllowed } from "../state/pageAccess";
import { Forum } from "../forum/Forum";

export function ForumPage() {
  const { user } = useAuth();
  const state = useVisibilityState();

  if (!isPageAllowed("forum", state)) {
    return <p>This section isn't available right now.</p>;
  }

  return <Forum uid={user?.uid ?? null} />;
}

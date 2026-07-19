import { useVisibilityState } from "../state/useVisibilityState";
import { isPageAllowed, PageKey } from "../state/pageAccess";

export function PlaceholderPage({ page, label }: { page: PageKey; label: string }) {
  const state = useVisibilityState();
  if (!isPageAllowed(page, state)) {
    return <p>This section isn't available right now.</p>;
  }
  return <p>{label} — coming soon.</p>;
}

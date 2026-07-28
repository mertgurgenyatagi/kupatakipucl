import { useVisibilityState } from "../state/useVisibilityState";
import { isPageAllowed, PageKey } from "../state/pageAccess";

export function PlaceholderPage({ page, label }: { page: PageKey; label: string }) {
  const state = useVisibilityState();
  if (!isPageAllowed(page, state)) {
    return <p>Bu bölüm şu anda kullanılamıyor.</p>;
  }
  return <p>{label} — yakında.</p>;
}

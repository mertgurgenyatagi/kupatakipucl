import { Link } from "react-router-dom";
import { useVisibilityState } from "../state/useVisibilityState";
import { isPageAllowed } from "../state/pageAccess";
import { cn } from "@/lib/utils";

/**
 * The way out of a fixture teaser and into the full calendar. Both
 * upcoming-match widgets show a handful of fixtures and then stop; this is
 * how anyone finds out there's a whole page of them.
 *
 * Gated on the same table the router and both navs read, rather than a
 * hand-rolled "is there a user" check: Home's preview is one of the widgets a
 * logged-out visitor sees, and a link that only ever leads to "Bu bölüm şu
 * anda kullanılamıyor." is worse than no link. Asking pageAccess directly
 * means this can't drift if /matches is ever opened up or closed down.
 */
export function AllMatchesLink({ className }: { className?: string }) {
  const state = useVisibilityState();
  if (!isPageAllowed("matches", state)) return null;

  return (
    <Link
      to="/matches"
      className={cn(
        "shrink-0 cursor-pointer px-3 py-2 text-right font-mono text-[0.6rem] tracking-[0.18em] text-color_textsecondary uppercase transition-colors duration-150 ease-[var(--ease-cotton)] hover:text-color_text",
        className
      )}
    >
      Tüm maçlar →
    </Link>
  );
}

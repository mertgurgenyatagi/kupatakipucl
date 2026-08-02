import { Link } from "react-router-dom";

export function BracketCtaBanner() {
  return (
    <Link
      to="/bracket"
      className="inline-flex shrink-0 items-center gap-2 rounded-full bg-color_text px-6 py-3 text-sm font-semibold text-background outline-none transition-all duration-150 ease-[var(--ease-cotton)] hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-color_accent"
    >
      Eleme Turu Tahminini Yap
    </Link>
  );
}

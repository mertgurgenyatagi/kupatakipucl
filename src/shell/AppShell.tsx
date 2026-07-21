import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useTournamentPhase } from "../tournament/useTournamentPhase";
import { getVisibilityState, VisibilityState } from "../state/visibilityState";
import { LoginButton } from "../auth/LoginButton";
import { LogoutButton } from "../auth/LogoutButton";
import { cn } from "@/lib/utils";

interface NavLink {
  path: string;
  label: string;
}

const NAV_LINKS: Record<VisibilityState, NavLink[]> = {
  NST_NLI: [{ path: "/", label: "Home" }],
  NST_LI: [
    { path: "/", label: "Home" },
    { path: "/predictions", label: "Predictions" },
    { path: "/chat", label: "Chat" },
    { path: "/forum", label: "Forum" },
  ],
  ST_NLI: [
    { path: "/", label: "Home" },
    { path: "/leaderboard", label: "Leaderboard" },
    { path: "/stats", label: "Stats" },
    { path: "/forum", label: "Forum" },
  ],
  ST_LI: [
    { path: "/", label: "Home" },
    { path: "/predictions", label: "Predictions" },
    { path: "/leaderboard", label: "Leaderboard" },
    { path: "/chat", label: "Chat" },
    { path: "/forum", label: "Forum" },
    { path: "/stats", label: "Stats" },
  ],
};

/** A quiet press-box clock — the room is lit, it's 9:30 PM somewhere
 *  (DESIGN-SPEC §18). Minute resolution, not a ticking gimmick. */
function PressClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return (
    <span className="font-mono text-[0.7rem] tracking-[0.2em] text-navy-muted tnum">
      {hh}:{mm}
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const phase = useTournamentPhase();
  const location = useLocation();
  const state = getVisibilityState(Boolean(user), phase);
  const links = NAV_LINKS[state];

  return (
    <div className="flex min-h-dvh flex-col bg-background lg:h-dvh lg:min-h-0 lg:flex-row lg:overflow-hidden">
      {/* --- The navy masthead: identity, nav, chrono (all pages) ----- */}
      <header
        className={cn(
          "relative flex flex-col bg-navy text-navy-ink",
          "px-6 pt-6 pb-5",
          "lg:h-full lg:w-[38%] lg:min-w-[320px] lg:max-w-[520px]",
          "lg:px-9 lg:pt-9 lg:pb-8"
        )}
      >
        {/* silver seam between navy and the ledger sheet */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-silver/40 lg:inset-y-0 lg:left-auto lg:right-0 lg:h-auto lg:w-px lg:animate-[seam-breathe_6s_ease-in-out_infinite]"
        />

        {/* Nameplate — set between medium and huge (DESIGN-SPEC §19) */}
        <div className="animate-cotton-fade">
          <Link
            to="/"
            className="group block w-fit rounded-sm leading-none no-underline outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-silver"
          >
            <span className="block font-display text-4xl font-semibold tracking-[-0.01em] text-navy-ink lg:text-6xl">
              KUPATAKIP
            </span>
            <span className="mt-2 flex items-center gap-3">
              <span className="h-px w-8 bg-brass/70" />
              <span className="font-mono text-xs tracking-[0.45em] text-navy-muted">
                UCL · 2026/27
              </span>
            </span>
          </Link>
          <p className="mt-5 font-mono text-[0.68rem] leading-relaxed tracking-[0.22em] text-navy-muted lg:mt-7">
            50 KATILIMCI · 36 TAKIM · TEK KUPA
          </p>
        </div>

        {/* Navigation — pinned, always visible (DESIGN-SPEC §39).
            Editorial section labels, not a menu component. */}
        <nav
          aria-label="Ana gezinme"
          className="mt-6 flex flex-wrap gap-x-5 gap-y-2 lg:mt-12 lg:flex-1 lg:flex-col lg:gap-y-1.5"
        >
          {links.map((link) => {
            const active =
              link.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative w-fit rounded-sm font-mono text-[0.78rem] uppercase tracking-[0.16em] no-underline transition-colors duration-300 ease-[var(--ease-cotton)] outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-silver",
                  active ? "text-navy-ink" : "text-navy-muted hover:text-navy-ink"
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-1/2 -left-4 hidden h-px -translate-y-1/2 bg-brass transition-all duration-300 ease-[var(--ease-cotton)] lg:block",
                    active ? "w-3 opacity-100" : "w-0 opacity-0 group-hover:w-2 group-hover:opacity-60"
                  )}
                />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Chrono / account — the room, lit, after dark */}
        <div className="mt-6 flex items-center justify-between gap-4 border-t border-navy-line/70 pt-4 lg:mt-0">
          <div className="flex items-center gap-3">
            <PressClock />
            <span className="hidden font-mono text-[0.62rem] tracking-[0.22em] text-navy-muted/70 sm:inline">
              PRESS BOX
            </span>
          </div>
          {!loading && (
            <div className="account-slot [&_button]:cursor-pointer [&_button]:rounded-sm [&_button]:border [&_button]:border-navy-line [&_button]:bg-transparent [&_button]:px-3 [&_button]:py-1.5 [&_button]:font-mono [&_button]:text-[0.68rem] [&_button]:uppercase [&_button]:tracking-[0.14em] [&_button]:text-navy-muted [&_button]:transition-colors [&_button]:duration-300 hover:[&_button]:border-silver hover:[&_button]:text-navy-ink [&_button]:outline-none focus-visible:[&_button]:outline-2 focus-visible:[&_button]:outline-offset-2 focus-visible:[&_button]:outline-silver [&_[role=alert]]:mt-2 [&_[role=alert]]:text-[0.68rem] [&_[role=alert]]:text-brass">
              {user ? <LogoutButton /> : <LoginButton />}
            </div>
          )}
        </div>
      </header>

      {/* --- The ledger sheet: routed pages live here ----------------- */}
      <main className="flex min-h-0 flex-1 flex-col bg-background lg:overflow-hidden">
        <div
          key={location.pathname}
          className="flex min-h-0 flex-1 flex-col animate-cotton-fade"
        >
          {children}
        </div>
      </main>
    </div>
  );
}

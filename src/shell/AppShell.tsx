import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useTournamentPhase } from "../tournament/useTournamentPhase";
import { getVisibilityState, VisibilityState } from "../state/visibilityState";
import { useProfile } from "../profile/useProfile";
import { LoginButton } from "../auth/LoginButton";
import { LogoutButton } from "../auth/LogoutButton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface NavLink {
  path: string;
  label: string;
}

// No nav distinction yet between league phase / pre-knockout / knockout —
// all three started phases share the same link set per login state.
const NOTSTARTED_LOGGEDOUT_LINKS: NavLink[] = [{ path: "/", label: "Home" }];
const NOTSTARTED_LOGGEDIN_LINKS: NavLink[] = [
  { path: "/", label: "Home" },
  { path: "/predictions", label: "Predictions" },
  { path: "/chat", label: "Chat" },
  { path: "/forum", label: "Forum" },
];
// Forum dropped for logged-out visitors here (previously included) — round-1
// pagemap answer: forum is logged-in-only in every phase now, no exceptions.
const STARTED_LOGGEDOUT_LINKS: NavLink[] = [
  { path: "/", label: "Home" },
  { path: "/leaderboard", label: "Leaderboard" },
];
const STARTED_LOGGEDIN_LINKS: NavLink[] = [
  { path: "/", label: "Home" },
  { path: "/predictions", label: "Predictions" },
  { path: "/leaderboard", label: "Leaderboard" },
  { path: "/chat", label: "Chat" },
  { path: "/forum", label: "Forum" },
  { path: "/stats", label: "Stats" },
];

const NAV_LINKS: Record<VisibilityState, NavLink[]> = {
  loggedout_notstarted: NOTSTARTED_LOGGEDOUT_LINKS,
  loggedin_notstarted: NOTSTARTED_LOGGEDIN_LINKS,
  loggedout_leaguephase: STARTED_LOGGEDOUT_LINKS,
  loggedin_leaguephase: STARTED_LOGGEDIN_LINKS,
  loggedout_preknockout: STARTED_LOGGEDOUT_LINKS,
  loggedin_preknockout: STARTED_LOGGEDIN_LINKS,
  loggedout_knockout: STARTED_LOGGEDOUT_LINKS,
  loggedin_knockout: STARTED_LOGGEDIN_LINKS,
};

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const phase = useTournamentPhase();
  const location = useLocation();
  const state = getVisibilityState(Boolean(user), phase);
  const links = NAV_LINKS[state];
  const { profile } = useProfile(user?.uid ?? null);

  return (
    <div className="flex min-h-dvh flex-col bg-background lg:h-dvh lg:min-h-0 lg:overflow-hidden">
      {/* --- Top bar: identity, nav, account (all pages) -----------------
          Navy, matching every frame's title band (DESIGN-SPEC §0d — dark
          mode as a whole was tried and discarded; this one change from it,
          a permanently navy top bar, stayed). Fixed to the top; the
          content region below fills the rest of the fixed viewport. */}
      <header className="relative shrink-0 border-b border-navy-line/50 bg-navy px-5 py-2.5 sm:px-7 lg:px-9">
        <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center gap-x-6 gap-y-3">
          {/* Nameplate — real weight (§19), no static count in the copy so
              nothing here can drift from the live figures shown in-page. */}
          <Link
            to="/"
            className="group order-1 mr-auto flex items-center gap-2.5 rounded-sm leading-none no-underline outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-navy-ink lg:mr-0"
          >
            <img
              src="/brand/kupatakip-logo-white.svg"
              alt=""
              aria-hidden
              className="size-6 shrink-0 sm:size-7"
            />
            <span className="font-display text-xl tracking-[-0.01em] text-navy-ink sm:text-[1.55rem]">
              <span className="font-[450]">#kupatakip</span>
              <span className="font-thin">ucl</span>
            </span>
          </Link>

          {/* Navigation — pinned, always visible (DESIGN-SPEC §39). One row
              on desktop; wraps to its own scrollable line on mobile so no
              link is ever hidden behind a menu (§53). */}
          <nav
            aria-label="Ana gezinme"
            lang="en"
            className="no-scrollbar order-3 -mx-1 flex w-full items-center gap-x-1 overflow-x-auto px-1 lg:order-2 lg:mx-0 lg:w-auto lg:flex-1 lg:justify-center lg:overflow-visible lg:px-0"
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
                    "relative shrink-0 rounded-md px-3 py-1.5 font-mono text-[0.72rem] uppercase tracking-[0.14em] no-underline transition-colors duration-150 ease-[var(--ease-cotton)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-ink",
                    active
                      ? "text-navy-ink"
                      : "text-navy-muted hover:text-navy-ink"
                  )}
                >
                  {link.label}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-x-3 -bottom-px h-[2px] rounded-full bg-brass transition-all duration-300 ease-[var(--ease-cotton)]",
                      active ? "opacity-100" : "opacity-0"
                    )}
                  />
                </Link>
              );
            })}
          </nav>

          {/* Account slot */}
          <div className="order-2 flex items-center gap-3 lg:order-3 sm:gap-4">
            {/* Dev-only shortcut to /dev — Mert: "ill remove it way before
                launch," so it's gated on the DEV build flag rather than
                anything more permanent. */}
            {import.meta.env.DEV && (
              <Link
                to="/dev"
                className="rounded-md border border-navy-line px-3 py-1.5 font-mono text-[0.72rem] tracking-[0.02em] text-navy-ink no-underline transition-colors duration-150 hover:border-brass"
              >
                Dev Panel
              </Link>
            )}
            {!loading && user && profile && (
              <Link
                to="/profile"
                className="flex items-center gap-2 rounded-md px-2 py-1 no-underline outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-ink"
              >
                <Avatar size="sm">
                  <AvatarImage src={profile.photoURL} alt="" />
                  <AvatarFallback className="font-mono text-[0.65rem] text-navy-ink">
                    {profile.firstName.charAt(0)}
                    {profile.lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="font-mono text-[0.72rem] text-navy-ink">{profile.firstName}</span>
              </Link>
            )}
            {!loading && (
              <div lang="en" className="account-slot [&_button]:cursor-pointer [&_button]:rounded-md [&_button]:border [&_button]:border-navy-line [&_button]:bg-transparent [&_button]:px-3 [&_button]:py-1.5 [&_button]:font-mono [&_button]:text-[0.72rem] [&_button]:tracking-[0.02em] [&_button]:text-navy-ink [&_button]:transition-colors [&_button]:duration-150 hover:[&_button]:border-brass [&_button]:outline-none focus-visible:[&_button]:outline-2 focus-visible:[&_button]:outline-offset-2 focus-visible:[&_button]:outline-navy-ink [&_[role=alert]]:mt-2 [&_[role=alert]]:text-[0.68rem] [&_[role=alert]]:text-destructive">
                {user ? <LogoutButton /> : <LoginButton />}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* --- Content region: routed pages compose their own framed cells -- */}
      <main className="ground-radiance flex min-h-0 min-w-0 flex-1 flex-col lg:overflow-hidden">
        <div
          key={location.pathname}
          className="flex min-h-0 min-w-0 flex-1 flex-col animate-cotton-fade"
        >
          {children}
        </div>
      </main>
    </div>
  );
}

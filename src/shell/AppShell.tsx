import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
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
// Hakkında (About) is static content, ungated in every VisibilityState —
// same precedent as Ana Sayfa, appended last in every link set below.
const NOTSTARTED_LOGGEDOUT_LINKS: NavLink[] = [
  { path: "/", label: "Ana Sayfa" },
  { path: "/about", label: "Hakkında" },
];
const NOTSTARTED_LOGGEDIN_LINKS: NavLink[] = [
  { path: "/", label: "Ana Sayfa" },
  { path: "/forum", label: "Forum" },
  { path: "/about", label: "Hakkında" },
];
// Forum re-added for logged-out visitors 2026-08-02, reversing the earlier
// round-1 pagemap closure — see src/state/pageAccess.ts's matching comment.
// Leaderboard is signed-in-only (participant standings shouldn't be
// browsable, let alone linked from the nav, without an account).
const STARTED_LOGGEDOUT_LINKS: NavLink[] = [
  { path: "/", label: "Ana Sayfa" },
  { path: "/forum", label: "Forum" },
  { path: "/about", label: "Hakkında" },
];
const STARTED_LOGGEDIN_LINKS: NavLink[] = [
  { path: "/", label: "Ana Sayfa" },
  { path: "/leaderboard", label: "Puan Durumu" },
  { path: "/forum", label: "Forum" },
  { path: "/stats", label: "İstatistikler" },
  { path: "/about", label: "Hakkında" },
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
    <div className="flex min-h-dvh cursor-default flex-col bg-background lg:h-dvh lg:min-h-0 lg:overflow-hidden">
      {/* Cursorify (DESIGN.md §6): set once here since AppShell wraps every
          page — no I-beam anywhere by default, individual interactive
          elements opt back into `cursor-pointer` themselves. */}
      {/* --- Top bar: identity, nav, account (all pages) -----------------
          Navy, matching every frame's title band (DESIGN-SPEC §0d — dark
          mode as a whole was tried and discarded; this one change from it,
          a permanently color_secondary top bar, stayed). Fixed to the top; the
          content region below fills the rest of the fixed viewport. */}
      <header className="relative shrink-0 border-b border-color_border1/50 bg-color_secondary px-5 py-2.5 sm:px-7 lg:px-9">
        <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center gap-x-6 gap-y-3">
          {/* Nameplate — real weight (§19), no static count in the copy so
              nothing here can drift from the live figures shown in-page. */}
          <Link
            to="/"
            className="group order-1 mr-auto flex items-center gap-2.5 rounded-sm leading-none no-underline outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-color_text lg:mr-0"
          >
            <img
              src="/brand/kupatakip-logo-white.svg"
              alt=""
              aria-hidden
              className="size-6 shrink-0 sm:size-7"
            />
            <span className="font-display text-xl tracking-[-0.01em] text-color_text sm:text-[1.55rem]">
              <span className="font-[450]">#kupatakip</span>
              <span className="font-thin">ucl</span>
            </span>
          </Link>

          {/* Navigation — pinned, always visible (DESIGN-SPEC §39). One row
              on desktop; wraps to its own scrollable line on mobile so no
              link is ever hidden behind a menu (§53). */}
          <nav
            aria-label="Ana gezinme"
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
                    "relative shrink-0 rounded-md px-3 py-1.5 font-mono text-[0.72rem] uppercase tracking-[0.14em] no-underline transition-colors duration-150 ease-[var(--ease-cotton)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-color_text",
                    active
                      ? "text-color_text"
                      : "text-color_textsecondary hover:text-color_text"
                  )}
                >
                  {link.label}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-x-3 -bottom-px h-[2px] rounded-full bg-color_accent transition-all duration-300 ease-[var(--ease-cotton)]",
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
                className="rounded-md border border-color_border1 px-3 py-1.5 font-mono text-[0.72rem] tracking-[0.02em] text-color_text no-underline transition-colors duration-150 hover:border-color_accent"
              >
                Dev Panel
              </Link>
            )}
            {!loading && user && profile && (
              <Link
                to="/profile"
                className="flex items-center gap-2 rounded-md px-2 py-1 no-underline outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-color_text"
              >
                <Avatar size="sm">
                  <AvatarImage src={profile.photoURL} alt="" />
                  <AvatarFallback className="font-mono text-[0.65rem] text-color_text">
                    {profile.firstName.charAt(0)}
                    {profile.lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="font-mono text-[0.72rem] text-color_text">{profile.firstName}</span>
              </Link>
            )}
            {!loading && (
              <div className="account-slot [&_button]:cursor-pointer [&_button]:rounded-md [&_button]:border [&_button]:border-color_border1 [&_button]:bg-transparent [&_button]:px-3 [&_button]:py-1.5 [&_button]:font-mono [&_button]:text-[0.72rem] [&_button]:tracking-[0.02em] [&_button]:text-color_text [&_button]:transition-colors [&_button]:duration-150 hover:[&_button]:border-color_accent [&_button]:outline-none focus-visible:[&_button]:outline-2 focus-visible:[&_button]:outline-offset-2 focus-visible:[&_button]:outline-color_text [&_[role=alert]]:mt-2 [&_[role=alert]]:text-[0.68rem] [&_[role=alert]]:text-color_remove">
                {user ? <LogoutButton /> : <LoginButton />}
              </div>
            )}
          </div>
        </div>
      </header>

      <Toaster closeButton />

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

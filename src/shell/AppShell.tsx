import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useTournamentPhase } from "../tournament/useTournamentPhase";
import { getVisibilityState, VisibilityState } from "../state/visibilityState";
import { LoginButton } from "../auth/LoginButton";
import { LogoutButton } from "../auth/LogoutButton";

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

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const phase = useTournamentPhase();
  const state = getVisibilityState(Boolean(user), phase);
  const links = NAV_LINKS[state];

  return (
    <div>
      <header>
        <span>#kupatakipucl</span>
        <nav>
          {links.map((link) => (
            <Link key={link.path} to={link.path}>
              {link.label}
            </Link>
          ))}
        </nav>
        {!loading && (user ? <LogoutButton /> : <LoginButton />)}
      </header>
      <main>{children}</main>
    </div>
  );
}

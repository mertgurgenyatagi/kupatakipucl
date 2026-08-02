import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { ProfileGate } from "./profile/ProfileGate";
import { AppShell } from "./shell/AppShell";
import { ErrorBoundary } from "./shell/ErrorBoundary";
import { HomePage } from "./pages/HomePage";
import { AboutPage } from "./pages/AboutPage";
import { PredictionsPage } from "./pages/PredictionsPage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { ForumPage } from "./pages/ForumPage";
import { StatsPage } from "./pages/StatsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { JoinLobbyPage } from "./pages/JoinLobbyPage";
import { DevPanel } from "./devpanel/DevPanel";

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ProfileGate>
          <HashRouter>
            <AppShell>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/predictions" element={<PredictionsPage />} />
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/forum" element={<ForumPage />} />
                <Route path="/stats" element={<StatsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/join/:inviteId" element={<JoinLobbyPage />} />
                {import.meta.env.DEV && <Route path="/dev" element={<DevPanel />} />}
              </Routes>
            </AppShell>
          </HashRouter>
        </ProfileGate>
      </AuthProvider>
    </ErrorBoundary>
  );
}

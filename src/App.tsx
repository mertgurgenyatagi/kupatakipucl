import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { ProfileGate } from "./profile/ProfileGate";
import { AppShell } from "./shell/AppShell";
import { ErrorBoundary } from "./shell/ErrorBoundary";
import { HomePage } from "./pages/HomePage";
import { PredictionsPage } from "./pages/PredictionsPage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { ForumPage } from "./pages/ForumPage";
import { StatsPage } from "./pages/StatsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { DevPanel } from "./devpanel/DevPanel";
import { TeamPopupTuner } from "./devpanel/TeamPopupTuner";
import { StatsPageTuner } from "./devpanel/StatsPageTuner";
import { HomeLoggedInTuner } from "./devpanel/HomeLoggedInTuner";
import { ForumTuner } from "./devpanel/ForumTuner";
import { ColorTuner } from "./devpanel/ColorTuner";

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ProfileGate>
          <HashRouter>
            <AppShell>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/predictions" element={<PredictionsPage />} />
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/forum" element={<ForumPage />} />
                <Route path="/stats" element={<StatsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                {import.meta.env.DEV && <Route path="/dev" element={<DevPanel />} />}
                {import.meta.env.DEV && (
                  <Route path="/dev/team-popup-tuner" element={<TeamPopupTuner />} />
                )}
                {import.meta.env.DEV && (
                  <Route path="/dev/stats-tuner" element={<StatsPageTuner />} />
                )}
                {import.meta.env.DEV && (
                  <Route path="/dev/home-loggedin-tuner" element={<HomeLoggedInTuner />} />
                )}
                {import.meta.env.DEV && <Route path="/dev/forum-tuner" element={<ForumTuner />} />}
                {import.meta.env.DEV && <Route path="/dev/color-tuner" element={<ColorTuner />} />}
              </Routes>
            </AppShell>
          </HashRouter>
        </ProfileGate>
      </AuthProvider>
    </ErrorBoundary>
  );
}

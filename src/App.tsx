import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { ProfileGate } from "./profile/ProfileGate";
import { AppShell } from "./shell/AppShell";
import { HomePage } from "./pages/HomePage";
import { PredictionsPage } from "./pages/PredictionsPage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { ChatPage } from "./pages/ChatPage";
import { ForumPage } from "./pages/ForumPage";
import { StatsPage } from "./pages/StatsPage";

export function App() {
  return (
    <AuthProvider>
      <ProfileGate>
        <HashRouter>
          <AppShell>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/predictions" element={<PredictionsPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/forum" element={<ForumPage />} />
              <Route path="/stats" element={<StatsPage />} />
            </Routes>
          </AppShell>
        </HashRouter>
      </ProfileGate>
    </AuthProvider>
  );
}

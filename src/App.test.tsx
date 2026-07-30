import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, afterEach } from "vitest";
import { App } from "./App";

const mockUseAuth = vi.fn();

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: vi.fn(),
}));

vi.mock("./firebase", () => ({ auth: {}, db: {} }));

vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, name: string) => ({ name }),
  // collectionGroup/documentId/where — Special Lobby's useMyLobbies.ts
  // subscribes to a `members` collection group even on Home (Sohbet/
  // Katılımcılar cells now fetch it unconditionally); a no-op passthrough
  // is enough here since lobby data itself isn't under test in this suite.
  collectionGroup: (_db: unknown, name: string) => ({ name }),
  documentId: () => "__name__",
  where: (...args: unknown[]) => args,
  getDocs: () => Promise.resolve({ docs: [] }),
  getDoc: () => Promise.resolve({ exists: () => false, data: () => ({}) }),
  doc: (_db: unknown, collection: string, id: string) => ({ collection, id }),
  // query/orderBy/limit/startAfter — useMessages.ts's live chat listener
  // builds a query with these even on a page (Home) this suite only
  // passes through on the way to Forum; a no-op passthrough is enough
  // since chat data itself isn't under test here.
  query: (...args: unknown[]) => args,
  orderBy: () => ({}),
  limit: () => ({}),
  startAfter: () => ({}),
  onSnapshot: (_ref: unknown, onNext: (snapshot: { exists: () => boolean; data: () => unknown; docs: unknown[] }) => void) => {
    onNext({ exists: () => false, data: () => ({}), docs: [] });
    return () => {};
  },
  setDoc: () => Promise.resolve(undefined),
}));

vi.mock("./auth/AuthProvider", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => mockUseAuth(),
}));

vi.mock("./profile/ProfileGate", () => ({
  ProfileGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("App routing integration", () => {
  afterEach(() => {
    window.history.pushState({}, "", "/");
  });

  it("renders the logged-out landing page for the not-started state by default", async () => {
    // Tournament phase now comes from the tournamentState Firestore doc (see
    // tournament/useTournamentPhase.ts); the generic onSnapshot mock above
    // always reports "doesn't exist", so phase defaults to notstarted here.
    // src/home/HomeLandingLoggedOut.tsx renders for this exact state.
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    render(<App />);
    expect(await screen.findByText(/Şampiyonlar Ligi nasıl ilerleyecek/)).toBeInTheDocument();
  });

  it("navigates to an allowed page via the nav link", async () => {
    // Logged in (not logged-out) so Forum is actually in the loggedin_
    // notstarted nav — loggedout_notstarted hides Forum too (pageAccess.ts),
    // so that combination has no Forum link to click. Forum now renders real
    // content (unit 5), so this asserts on the new-thread PostForm's submit
    // button rather than the old placeholder text — findByText lets
    // ForumPage's async data hooks settle first.
    mockUseAuth.mockReturnValue({ user: { uid: "1" }, loading: false });
    render(<App />);
    fireEvent.click(screen.getByText("Forum"));
    expect(await screen.findByText("Paylaş")).toBeInTheDocument();
  });

  it("shows the blocked message when a disallowed page is reached directly", async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    window.history.pushState({}, "", "#/leaderboard");
    render(<App />);
    // LeaderboardPage still fires its data hooks even while blocked (Rules of
    // Hooks) — findByText lets that pending fetch settle before the test
    // ends, so it doesn't leak an unwrapped state update into a later test.
    expect(
      await screen.findByText("Bu bölüm şu anda kullanılamıyor.")
    ).toBeInTheDocument();
  });
});

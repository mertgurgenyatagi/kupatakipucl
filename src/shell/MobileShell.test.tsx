import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { AppShell } from "./AppShell";
import { isPageAllowed, PageKey } from "../state/pageAccess";
import { VisibilityState } from "../state/visibilityState";
import { TournamentPhase } from "../tournament/tournamentPhase";

/**
 * The mobile shell, exercised through `AppShell` — i.e. through the real
 * breakpoint fork, not by importing MobileShell directly. That way these
 * tests also assert the fork itself works, and would fail if the branch were
 * ever wired the wrong way round.
 *
 * The nav-matches-pageAccess invariant is repeated here rather than assumed
 * from `AppShell.test.tsx`. Both shells read the same `NAV_LINKS` table, so
 * in principle one test covers both — but the *rendering* is independent
 * (a drawer, opened by a button, versus an always-visible strip), and a
 * drawer that never opens would pass a test that only checks the table.
 */

const mockUseAuth = vi.fn();
const mockUseTournamentPhase = vi.fn();
const mockUseProfile = vi.fn();

vi.mock("../auth/AuthProvider", () => ({ useAuth: () => mockUseAuth() }));
vi.mock("../tournament/useTournamentPhase", () => ({
  useTournamentPhase: () => mockUseTournamentPhase(),
}));
vi.mock("../profile/useProfile", () => ({
  useProfile: (uid: string | null) => mockUseProfile(uid),
}));
vi.mock("../auth/LoginButton", () => ({
  LoginButton: ({ label }: { label?: string }) => <button>{label ?? "Google ile giriş yap"}</button>,
}));
vi.mock("../auth/LogoutButton", () => ({ LogoutButton: () => <button>Çıkış yap</button> }));
// The chat drawer opens live Firestore/RTDB listeners; this suite is about
// the shell's own structure, so it's stubbed to a marker.
vi.mock("./MobileChatDrawer", () => ({
  MobileChatDrawer: ({ open }: { open: boolean }) =>
    open ? <div data-testid="chat-drawer" /> : null,
}));

const STATE_FIXTURES: {
  state: VisibilityState;
  user: { uid: string } | null;
  phase: TournamentPhase;
}[] = [
  { state: "loggedout_notstarted", user: null, phase: "notstarted" },
  { state: "loggedin_notstarted", user: { uid: "1" }, phase: "notstarted" },
  { state: "loggedout_leaguephase", user: null, phase: "leaguephase" },
  { state: "loggedin_leaguephase", user: { uid: "1" }, phase: "leaguephase" },
  { state: "loggedout_preknockout", user: null, phase: "preknockout" },
  { state: "loggedin_knockout", user: { uid: "1" }, phase: "knockout" },
];

const GATED_PAGES: PageKey[] = ["leaderboard", "forum", "stats"];
const PAGE_LABELS: Record<PageKey, string> = {
  leaderboard: "Puan Durumu",
  forum: "Forum",
  stats: "İstatistikler",
  predictions: "Tahminini Yap",
  knockoutPredictions: "Eleme Tahminleri",
  profile: "Profil",
};

const originalMatchMedia = window.matchMedia;

function setMobile(isMobile: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: isMobile,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

function renderShell() {
  render(
    <MemoryRouter>
      <AppShell>
        <div>content</div>
      </AppShell>
    </MemoryRouter>
  );
}

beforeEach(() => {
  setMobile(true);
  mockUseProfile.mockReturnValue({ profile: null, loading: false });
});

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  vi.clearAllMocks();
});

describe("the breakpoint fork", () => {
  it("renders the mobile shell below the breakpoint", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockUseTournamentPhase.mockReturnValue("notstarted");
    renderShell();
    expect(screen.getByRole("button", { name: "Menüyü aç" })).toBeInTheDocument();
  });

  it("renders the desktop shell at and above it — no drawer opener at all", () => {
    setMobile(false);
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockUseTournamentPhase.mockReturnValue("notstarted");
    renderShell();
    expect(screen.queryByRole("button", { name: "Menüyü aç" })).not.toBeInTheDocument();
    // The desktop nav is inline, so its links are visible without opening
    // anything.
    expect(screen.getByRole("link", { name: "Ana Sayfa" })).toBeInTheDocument();
  });
});

describe("the nav drawer", () => {
  it("keeps its links out of the document until it is opened", async () => {
    mockUseAuth.mockReturnValue({ user: { uid: "1" }, loading: false });
    mockUseTournamentPhase.mockReturnValue("leaguephase");
    renderShell();

    expect(screen.queryByRole("link", { name: "Puan Durumu" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Menüyü aç" }));
    expect(await screen.findByRole("link", { name: "Puan Durumu" })).toBeInTheDocument();
  });

  it.each(STATE_FIXTURES)(
    "offers exactly the pages isPageAllowed grants for $state",
    async ({ user, phase, state }) => {
      mockUseAuth.mockReturnValue({ user, loading: false });
      mockUseTournamentPhase.mockReturnValue(phase);
      if (user) mockUseProfile.mockReturnValue({ profile: null, loading: false });
      renderShell();

      fireEvent.click(screen.getByRole("button", { name: "Menüyü aç" }));
      const nav = screen.getByRole("navigation", { name: "Ana gezinme" });

      GATED_PAGES.forEach((page) => {
        const link = within(nav).queryByRole("link", { name: PAGE_LABELS[page] });
        expect(Boolean(link)).toBe(isPageAllowed(page, state));
      });

      // Predictions is never a nav link in any state, on either shell.
      expect(within(nav).queryByRole("link", { name: /Tahmin/i })).toBeNull();
    }
  );
});

describe("the header's three slots", () => {
  it("shows the wordmark and a sign-in button when logged out, and no chat opener", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockUseTournamentPhase.mockReturnValue("notstarted");
    renderShell();

    expect(screen.getByRole("button", { name: "Giriş" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sohbeti aç" })).not.toBeInTheDocument();
  });

  // The wireframe's most surprising instruction, pinned so it can't be
  // "fixed" by accident: a signed-in viewer gets their own face in the centre
  // slot, not the brand.
  it("replaces the wordmark with the viewer's own profile link once signed in", () => {
    mockUseAuth.mockReturnValue({ user: { uid: "1" }, loading: false });
    mockUseTournamentPhase.mockReturnValue("leaguephase");
    mockUseProfile.mockReturnValue({
      profile: { firstName: "Mert", lastName: "G", photoURL: "" },
      loading: false,
    });
    renderShell();

    const profileLink = screen.getByRole("link", { name: /Mert/ });
    expect(profileLink).toHaveAttribute("href", "/profile");
    expect(screen.getByRole("button", { name: "Sohbeti aç" })).toBeInTheDocument();
  });

  it("opens the chat drawer from the header when signed in", async () => {
    mockUseAuth.mockReturnValue({ user: { uid: "1" }, loading: false });
    mockUseTournamentPhase.mockReturnValue("leaguephase");
    mockUseProfile.mockReturnValue({
      profile: { firstName: "Mert", lastName: "G", photoURL: "" },
      loading: false,
    });
    renderShell();

    expect(screen.queryByTestId("chat-drawer")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sohbeti aç" }));
    expect(screen.getByTestId("chat-drawer")).toBeInTheDocument();
  });
});

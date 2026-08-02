import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TEAMS } from "../predictions/teams";
import type { ComponentProps } from "react";

vi.mock("../tournament/now", () => ({ resolveNow: () => new Date("2026-09-01T00:00:00Z") }));

import { StartedHomeLoggedIn } from "./StartedHomeLoggedIn";

const ME = { uid: "uid1", firstName: "Mert", lastName: "Y", photoURL: "", createdAt: 1 };
const ENTRIES = [{ uid: "uid1", firstName: "Mert", lastName: "Y", photoURL: "", points: 30, ranking: [] }];
const LOBBY_MESSAGES = { messages: [], loading: false, loadOlder: vi.fn(), loadingOlder: false, hasMoreOlder: false };

function renderStartedHome(props: Partial<ComponentProps<typeof StartedHomeLoggedIn>> = {}) {
  return render(
    <MemoryRouter>
      <StartedHomeLoggedIn {...baseProps()} {...props} />
    </MemoryRouter>
  );
}

function baseProps() {
  return {
    me: ME,
    players: [ME],
    results: {},
    entries: ENTRIES,
    phase: "leaguephase" as const,
    bracketState: { ro16Teams: {}, winners: {} },
    bracketPrediction: null,
    snapshots: [],
    messages: [],
    onLoadOlderMessages: vi.fn(),
    loadingOlderMessages: false,
    hasMoreOlderMessages: false,
    onlineCount: 1,
    typingUids: [],
    posts: [],
    likesByPost: new Map(),
    onToggleLike: vi.fn(),
    likeError: null,
    onDeletePost: vi.fn(),
    onSaveEdit: vi.fn(),
    onRefetchPosts: vi.fn(),
    forumActionError: null,
    myLobbies: [],
    sohbetLobbyId: null,
    onChangeSohbetLobby: vi.fn(),
    sohbetLobbyMembers: [],
    sohbetLobbyMessages: LOBBY_MESSAGES,
    onOpenLobbyManagement: vi.fn(),
  };
}

describe("StartedHomeLoggedIn", () => {
  it("shows the league table during leaguephase", () => {
    renderStartedHome();
    expect(screen.getByTestId("team-table")).toBeInTheDocument();
  });

  it("swaps the league table for the bracket widget during knockout", () => {
    renderStartedHome({ phase: "knockout" });
    expect(screen.queryByTestId("team-table")).not.toBeInTheDocument();
    expect(screen.getByTestId("bracket-widget-round-ro16")).toBeInTheDocument();
  });

  it("shows the bracket CTA during preknockout when no bracket prediction exists yet", () => {
    renderStartedHome({ phase: "preknockout" });
    expect(screen.getByRole("link", { name: /eleme turu tahminini yap/i })).toBeInTheDocument();
  });

  it("hides the bracket CTA once a bracket prediction has been submitted", () => {
    renderStartedHome({
      phase: "preknockout",
      bracketPrediction: { picks: {} as any, submittedAt: 1 },
    });
    expect(screen.queryByRole("link", { name: /eleme turu tahminini yap/i })).not.toBeInTheDocument();
  });

  it("renders the mini-leaderboard, upcoming matches, chat, and forum widgets", () => {
    renderStartedHome();
    expect(screen.getAllByTestId("mini-leaderboard-row").length).toBeGreaterThan(0);
    expect(screen.getByText("Yaklaşan Maçlar")).toBeInTheDocument();
    expect(screen.getByText("Genel")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Forum" })).toBeInTheDocument();
  });

  it("opens the team popup when a league-table row is clicked", () => {
    renderStartedHome();
    // TeamTable's rows have no data-testid (confirmed against the real
    // component) — click bubbles from the team's own short-name text up to
    // the row's onClick, same as a real user interaction.
    fireEvent.click(screen.getByText(TEAMS[0].shortName));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

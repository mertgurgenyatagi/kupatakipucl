import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetDocs = vi.fn();
const mockGetDoc = vi.fn();
const mockCollection = vi.fn((_db: unknown, name: string) => ({ name }));
const mockDoc = vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id }));

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, string])),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  doc: (...args: unknown[]) => mockDoc(...(args as [unknown, string, string])),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { ParticipantPopup } from "./ParticipantPopup";
import { TEAMS } from "../predictions/teams";
import { LeaderboardEntry } from "./leaderboardTypes";
import { TeamResult } from "./teamResultTypes";

const baseEntry: LeaderboardEntry = {
  uid: "uid1",
  firstName: "Ada",
  photoURL: "a.png",
  points: 9,
  ranking: [TEAMS[0].id, TEAMS[1].id],
  submittedAt: Date.UTC(2026, 7, 20),
};

const otherEntry: LeaderboardEntry = {
  uid: "uid2",
  firstName: "Alan",
  photoURL: "b.png",
  points: 6,
  ranking: [TEAMS[2].id],
};

const PLAYERS = [
  { uid: "uid1", firstName: "Ada", lastName: "Lovelace", photoURL: "a.png", createdAt: 1 },
  { uid: "uid2", firstName: "Alan", lastName: "Turing", photoURL: "b.png", createdAt: 1 },
];

const results: Record<string, TeamResult> = {
  [TEAMS[0].id]: { position: 1, points: 15, goalDifference: 6, goalsFor: 10, goalsAgainst: 4, matchesPlayed: 5 },
};

describe("ParticipantPopup", () => {
  beforeEach(() => {
    mockGetDocs.mockReset();
    mockGetDoc.mockReset();
    mockGetDocs.mockResolvedValue({ docs: [] }); // devMatches: nothing decided by default
    mockGetDoc.mockResolvedValue({ exists: () => false, data: () => undefined }); // no survey by default
  });

  it("renders nothing when there is no selected participant", async () => {
    render(
      <ParticipantPopup
        ranked={null}
        entries={[baseEntry]}
        players={PLAYERS}
        results={{}}
        onOpenChange={() => {}}
        onSelectTeam={() => {}}
        tournamentStarted={true}
      />
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(mockGetDocs).toHaveBeenCalled());
  });

  it("shows the participant's name, rank and points, single-digit ranks unpadded", async () => {
    render(
      <ParticipantPopup
        ranked={{ entry: baseEntry, rank: 3 }}
        entries={[baseEntry, otherEntry]}
        players={PLAYERS}
        results={{}}
        onOpenChange={() => {}}
        onSelectTeam={() => {}}
        tournamentStarted={true}
      />
    );
    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.queryByText("03")).not.toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
  });

  it("shows first-name-only when players has no lastName for this uid (logged-out data)", async () => {
    render(
      <ParticipantPopup
        ranked={{ entry: baseEntry, rank: 3 }}
        entries={[baseEntry, otherEntry]}
        players={[{ uid: "uid1", firstName: "Ada", photoURL: "a.png", createdAt: 1 }]}
        results={{}}
        onOpenChange={() => {}}
        onSelectTeam={() => {}}
        tournamentStarted={true}
      />
    );
    expect(await screen.findByText("Ada")).toBeInTheDocument();
    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
  });

  it("lists the full predicted order with the team table's own stat columns (O/A/Y/AV/P)", async () => {
    render(
      <ParticipantPopup
        ranked={{ entry: baseEntry, rank: 3 }}
        entries={[baseEntry, otherEntry]}
        players={PLAYERS}
        results={results}
        onOpenChange={() => {}}
        onSelectTeam={() => {}}
        tournamentStarted={true}
      />
    );
    expect(await screen.findByText(TEAMS[0].shortName)).toBeInTheDocument();
    expect(screen.getByText(TEAMS[1].shortName)).toBeInTheDocument();
    // TEAMS[0]'s real stat line from `results`.
    expect(screen.getByText("15")).toBeInTheDocument(); // points
    expect(screen.getByText("+6")).toBeInTheDocument(); // goal difference, signed
    // TEAMS[1] has no result yet — stat cells fall back to "-".
    expect(screen.getAllByText("-").length).toBeGreaterThan(0);
  });

  it("calls onSelectTeam with the clicked row's team id", async () => {
    const onSelectTeam = vi.fn();
    render(
      <ParticipantPopup
        ranked={{ entry: baseEntry, rank: 3 }}
        entries={[baseEntry, otherEntry]}
        players={PLAYERS}
        results={results}
        onOpenChange={() => {}}
        onSelectTeam={onSelectTeam}
        tournamentStarted={true}
      />
    );
    const row = (await screen.findByText(TEAMS[0].shortName)).closest('[role="row"]')!;
    fireEvent.click(row);
    expect(onSelectTeam).toHaveBeenCalledWith(TEAMS[0].id);
  });

  it("shows survey answers once loaded", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        age: 25,
        footballKnowledge: 6,
        messiOrRonaldo: "messi",
        superLigTeam: "Galatasaray",
        uclTeam: "arsenal",
        device: "phone",
        submittedAt: 123,
      }),
    });
    render(
      <ParticipantPopup
        ranked={{ entry: baseEntry, rank: 3 }}
        entries={[baseEntry, otherEntry]}
        players={PLAYERS}
        results={{}}
        onOpenChange={() => {}}
        onSelectTeam={() => {}}
        tournamentStarted={true}
      />
    );
    // Every answer gets a trailing period, even ones that didn't have one.
    expect(await screen.findByText("Galatasaray.")).toBeInTheDocument();
    expect(screen.getByText("Messi.")).toBeInTheDocument();
    expect(screen.getByText("6 / 7.")).toBeInTheDocument();
    expect(screen.getByText("Süper Lig'de tuttuğunuz takım")).toBeInTheDocument();
    // The stored answer is the id "arsenal" — it has to read as a team name,
    // and the question must not still invite people to type one.
    expect(screen.getByText("Arsenal.")).toBeInTheDocument();
    expect(screen.queryByText("arsenal.")).not.toBeInTheDocument();
    expect(screen.getByText("Tuttuğunuz bir UCL takımı var mı?")).toBeInTheDocument();
    expect(screen.queryByText(/varsa yazın/)).not.toBeInTheDocument();
  });

  it("distinguishes a real read failure from a participant who simply never took the survey", async () => {
    mockGetDoc.mockRejectedValue(new Error("permission-denied"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ParticipantPopup
        ranked={{ entry: baseEntry, rank: 3 }}
        entries={[baseEntry, otherEntry]}
        players={PLAYERS}
        results={{}}
        onOpenChange={() => {}}
        onSelectTeam={() => {}}
        tournamentStarted={true}
      />
    );
    expect(await screen.findByText("Anket cevapları görüntülenemiyor.")).toBeInTheDocument();
    consoleErrorSpy.mockRestore();
  });

  it("does not fetch the survey and shows a sign-in message instead, when the viewer isn't logged in", async () => {
    render(
      <ParticipantPopup
        ranked={{ entry: baseEntry, rank: 3 }}
        entries={[baseEntry, otherEntry]}
        players={PLAYERS}
        results={{}}
        onOpenChange={() => {}}
        onSelectTeam={() => {}}
        tournamentStarted={true}
        viewerLoggedIn={false}
      />
    );
    expect(await screen.findByText("Anket cevaplarını görmek için giriş yapmalısınız.")).toBeInTheDocument();
    await waitFor(() => expect(mockGetDocs).toHaveBeenCalled()); // devMatches still loads
    expect(mockGetDoc).not.toHaveBeenCalled(); // but the survey read is skipped
  });

  it("shows a distinct, non-alarming message when the participant has no survey doc at all", async () => {
    render(
      <ParticipantPopup
        ranked={{ entry: baseEntry, rank: 3 }}
        entries={[baseEntry, otherEntry]}
        players={PLAYERS}
        results={{}}
        onOpenChange={() => {}}
        onSelectTeam={() => {}}
        tournamentStarted={true}
      />
    );
    expect(await screen.findByText("Bu katılımcı anketi doldurmamış.")).toBeInTheDocument();
  });

  it("shows the rank-over-time fallback when there isn't enough history yet", async () => {
    render(
      <ParticipantPopup
        ranked={{ entry: baseEntry, rank: 3 }}
        entries={[baseEntry, otherEntry]}
        players={PLAYERS}
        results={{}}
        onOpenChange={() => {}}
        onSelectTeam={() => {}}
        tournamentStarted={true}
      />
    );
    expect(
      await screen.findByText("Yeterli maç oynanmadan gösterilmez.")
    ).toBeInTheDocument();
  });

  it("never shows a predicted-champion section (dropped from the new 4-widget spec)", async () => {
    render(
      <ParticipantPopup
        ranked={{ entry: baseEntry, rank: 3 }}
        entries={[baseEntry, otherEntry]}
        players={PLAYERS}
        results={{}}
        onOpenChange={() => {}}
        onSelectTeam={() => {}}
        tournamentStarted={true}
      />
    );
    await waitFor(() => expect(mockGetDocs).toHaveBeenCalled());
    expect(screen.queryByText("Şampiyon Tahmini")).not.toBeInTheDocument();
  });

  it("calls onOpenChange(false) when the close button is activated", async () => {
    const onOpenChange = vi.fn();
    render(
      <ParticipantPopup
        ranked={{ entry: baseEntry, rank: 3 }}
        entries={[baseEntry, otherEntry]}
        players={PLAYERS}
        results={{}}
        onOpenChange={onOpenChange}
        onSelectTeam={() => {}}
        tournamentStarted={true}
      />
    );
    fireEvent.click(await screen.findByRole("button", { name: "Kapat" }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything()));
  });

  describe("before the tournament starts", () => {
    it("shows a not-viewable placeholder in place of the predictions grid, quiz answers, and rank history", async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          age: 25,
          footballKnowledge: 6,
          messiOrRonaldo: "messi",
          superLigTeam: "Galatasaray",
          uclTeam: "arsenal",
          device: "phone",
          submittedAt: 123,
        }),
      });
      render(
        <ParticipantPopup
          ranked={{ entry: baseEntry, rank: 3 }}
          entries={[baseEntry, otherEntry]}
          players={PLAYERS}
          results={results}
          onOpenChange={() => {}}
          onSelectTeam={() => {}}
          tournamentStarted={false}
        />
      );
      expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
      expect(screen.getAllByText("Turnuva başlamadan bu bilgi görüntülenemez.")).toHaveLength(3);
      expect(screen.queryByText(TEAMS[0].shortName)).not.toBeInTheDocument();
      expect(screen.queryByText("Galatasaray.")).not.toBeInTheDocument();
      expect(screen.queryByText("Yeterli maç oynanmadan gösterilmez.")).not.toBeInTheDocument();
    });

    it("does not fetch the survey or compute rank history at all", async () => {
      render(
        <ParticipantPopup
          ranked={{ entry: baseEntry, rank: 3 }}
          entries={[baseEntry, otherEntry]}
          players={PLAYERS}
          results={results}
          onOpenChange={() => {}}
          onSelectTeam={() => {}}
          tournamentStarted={false}
        />
      );
      await waitFor(() => expect(mockGetDocs).toHaveBeenCalled()); // devMatches still loads
      expect(mockGetDoc).not.toHaveBeenCalled(); // but the survey read is skipped
    });
  });

  describe("knockout-phase prediction tab default", () => {
    it("defaults to the Eleme Tahmini (knockout) tab when phase is knockout", async () => {
      render(
        <ParticipantPopup
          ranked={{ entry: baseEntry, rank: 3 }}
          entries={[baseEntry, otherEntry]}
          players={PLAYERS}
          results={results}
          onOpenChange={() => {}}
          onSelectTeam={() => {}}
          tournamentStarted={true}
          phase="knockout"
        />
      );
      // No knockout prediction doc exists for this uid (mockGetDoc defaults
      // to exists: () => false), so the knockout tab's own empty state is
      // the tell that the knockout tab, not the league grid, is active.
      expect(
        await screen.findByText("Bu katılımcı henüz eleme tahmini yapmamış.")
      ).toBeInTheDocument();
      expect(screen.queryByText(TEAMS[0].shortName)).not.toBeInTheDocument();
    });

    it("defaults to the Eleme Tahmini (knockout) tab when phase is preknockout", async () => {
      render(
        <ParticipantPopup
          ranked={{ entry: baseEntry, rank: 3 }}
          entries={[baseEntry, otherEntry]}
          players={PLAYERS}
          results={results}
          onOpenChange={() => {}}
          onSelectTeam={() => {}}
          tournamentStarted={true}
          phase="preknockout"
        />
      );
      expect(
        await screen.findByText("Bu katılımcı henüz eleme tahmini yapmamış.")
      ).toBeInTheDocument();
      expect(screen.queryByText(TEAMS[0].shortName)).not.toBeInTheDocument();
    });

    it("stays on the Lig Tahmini (league) tab when phase is leaguephase", async () => {
      render(
        <ParticipantPopup
          ranked={{ entry: baseEntry, rank: 3 }}
          entries={[baseEntry, otherEntry]}
          players={PLAYERS}
          results={results}
          onOpenChange={() => {}}
          onSelectTeam={() => {}}
          tournamentStarted={true}
          phase="leaguephase"
        />
      );
      // leaguephase isn't preknockout/knockout, so the popup renders the
      // classic compact view with no tabs at all — league predictions show
      // directly.
      expect(await screen.findByText(TEAMS[0].shortName)).toBeInTheDocument();
      expect(
        screen.queryByText("Bu katılımcı henüz eleme tahmini yapmamış.")
      ).not.toBeInTheDocument();
    });

    it("re-defaults to the knockout tab when switching to a different participant, even after a manual switch to league", async () => {
      const { rerender } = render(
        <ParticipantPopup
          ranked={{ entry: baseEntry, rank: 3 }}
          entries={[baseEntry, otherEntry]}
          players={PLAYERS}
          results={results}
          onOpenChange={() => {}}
          onSelectTeam={() => {}}
          tournamentStarted={true}
          phase="knockout"
        />
      );
      await screen.findByText("Bu katılımcı henüz eleme tahmini yapmamış.");

      fireEvent.click(screen.getByRole("button", { name: "Lig Tahmini" }));
      expect(await screen.findByText(TEAMS[0].shortName)).toBeInTheDocument();

      rerender(
        <ParticipantPopup
          ranked={{ entry: otherEntry, rank: 5 }}
          entries={[baseEntry, otherEntry]}
          players={PLAYERS}
          results={results}
          onOpenChange={() => {}}
          onSelectTeam={() => {}}
          tournamentStarted={true}
          phase="knockout"
        />
      );

      expect(
        await screen.findByText("Bu katılımcı henüz eleme tahmini yapmamış.")
      ).toBeInTheDocument();
      expect(screen.queryByText(TEAMS[2].shortName)).not.toBeInTheDocument();
    });
  });
});

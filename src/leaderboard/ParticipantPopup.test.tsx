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
  lastName: "Lovelace",
  photoURL: "a.png",
  points: 9,
  ranking: [TEAMS[0].id, TEAMS[1].id],
  submittedAt: Date.UTC(2026, 7, 20),
};

const otherEntry: LeaderboardEntry = {
  uid: "uid2",
  firstName: "Alan",
  lastName: "Turing",
  photoURL: "b.png",
  points: 6,
  ranking: [TEAMS[2].id],
};

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
      <ParticipantPopup ranked={null} entries={[baseEntry]} results={{}} onOpenChange={() => {}} />
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(mockGetDocs).toHaveBeenCalled());
  });

  it("shows the participant's name, rank and points, single-digit ranks unpadded", async () => {
    render(
      <ParticipantPopup
        ranked={{ entry: baseEntry, rank: 3 }}
        entries={[baseEntry, otherEntry]}
        results={{}}
        onOpenChange={() => {}}
      />
    );
    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.queryByText("03")).not.toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
  });

  it("lists the full predicted order with the team table's own stat columns (O/A/Y/AV/P)", async () => {
    render(
      <ParticipantPopup
        ranked={{ entry: baseEntry, rank: 3 }}
        entries={[baseEntry, otherEntry]}
        results={results}
        onOpenChange={() => {}}
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

  it("shows survey answers once loaded", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        age: 25,
        footballKnowledge: 6,
        messiOrRonaldo: "messi",
        superLigTeam: "Galatasaray",
        uclTeam: "Arsenal",
        device: "phone",
        submittedAt: 123,
      }),
    });
    render(
      <ParticipantPopup
        ranked={{ entry: baseEntry, rank: 3 }}
        entries={[baseEntry, otherEntry]}
        results={{}}
        onOpenChange={() => {}}
      />
    );
    // Every answer gets a trailing period, even ones that didn't have one.
    expect(await screen.findByText("Galatasaray.")).toBeInTheDocument();
    expect(screen.getByText("Messi.")).toBeInTheDocument();
    expect(screen.getByText("6 / 7.")).toBeInTheDocument();
    expect(screen.getByText("Süper Lig'de tuttuğunuz takım")).toBeInTheDocument();
  });

  it("distinguishes a real read failure from a participant who simply never took the survey", async () => {
    mockGetDoc.mockRejectedValue(new Error("permission-denied"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ParticipantPopup
        ranked={{ entry: baseEntry, rank: 3 }}
        entries={[baseEntry, otherEntry]}
        results={{}}
        onOpenChange={() => {}}
      />
    );
    expect(await screen.findByText("Anket cevapları görüntülenemiyor.")).toBeInTheDocument();
    consoleErrorSpy.mockRestore();
  });

  it("shows a distinct, non-alarming message when the participant has no survey doc at all", async () => {
    render(
      <ParticipantPopup
        ranked={{ entry: baseEntry, rank: 3 }}
        entries={[baseEntry, otherEntry]}
        results={{}}
        onOpenChange={() => {}}
      />
    );
    expect(await screen.findByText("Bu katılımcı anketi doldurmamış.")).toBeInTheDocument();
  });

  it("shows the rank-over-time fallback when there isn't enough history yet", async () => {
    render(
      <ParticipantPopup
        ranked={{ entry: baseEntry, rank: 3 }}
        entries={[baseEntry, otherEntry]}
        results={{}}
        onOpenChange={() => {}}
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
        results={{}}
        onOpenChange={() => {}}
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
        results={{}}
        onOpenChange={onOpenChange}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Kapat" }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything()));
  });
});

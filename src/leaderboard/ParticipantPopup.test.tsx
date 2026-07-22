import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ParticipantPopup } from "./ParticipantPopup";
import { TEAMS } from "../predictions/teams";
import { LeaderboardEntry } from "./leaderboardTypes";

const baseEntry: LeaderboardEntry = {
  uid: "uid1",
  firstName: "Ada",
  lastName: "Lovelace",
  photoURL: "a.png",
  points: 9,
  ranking: [TEAMS[0].id, TEAMS[1].id],
  submittedAt: Date.UTC(2026, 7, 20),
};

describe("ParticipantPopup", () => {
  it("renders nothing when there is no selected participant", () => {
    render(
      <ParticipantPopup ranked={null} results={{}} revealCorrectness={false} onOpenChange={() => {}} />
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the participant's name, rank and points", () => {
    render(
      <ParticipantPopup
        ranked={{ entry: baseEntry, rank: 3 }}
        results={{}}
        revealCorrectness={false}
        onOpenChange={() => {}}
      />
    );
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText(/Sıra 03/)).toBeInTheDocument();
    expect(screen.getByText(/9 puan/)).toBeInTheDocument();
  });

  it("lists the full predicted order in order, with no correctness shown before reveal", () => {
    render(
      <ParticipantPopup
        ranked={{ entry: baseEntry, rank: 3 }}
        results={{}}
        revealCorrectness={false}
        onOpenChange={() => {}}
      />
    );
    expect(screen.getByText(TEAMS[0].name)).toBeInTheDocument();
    expect(screen.getByText(TEAMS[1].name)).toBeInTheDocument();
    expect(screen.queryByText(/isabetli/)).not.toBeInTheDocument();
  });

  it("shows pick correctness once revealCorrectness is true", () => {
    const results = {
      [TEAMS[0].id]: { position: 1, points: 0, goalDifference: 0, goalsFor: 0, goalsAgainst: 0 },
      [TEAMS[1].id]: { position: 30, points: 0, goalDifference: 0, goalsFor: 0, goalsAgainst: 0 },
    };
    render(
      <ParticipantPopup
        ranked={{ entry: baseEntry, rank: 3 }}
        results={results}
        revealCorrectness
        onOpenChange={() => {}}
      />
    );
    expect(screen.getByText("1/2 isabetli")).toBeInTheDocument();
  });

  it("shows the submission date when available", () => {
    render(
      <ParticipantPopup
        ranked={{ entry: baseEntry, rank: 3 }}
        results={{}}
        revealCorrectness={false}
        onOpenChange={() => {}}
      />
    );
    expect(screen.getByText(/Tahmin gönderildi/)).toBeInTheDocument();
  });

  it("shows the reserved champion/timeline sections as honest placeholders, never quiz answers", () => {
    render(
      <ParticipantPopup
        ranked={{ entry: baseEntry, rank: 3 }}
        results={{}}
        revealCorrectness={false}
        onOpenChange={() => {}}
      />
    );
    expect(screen.getByText("Şampiyon Tahmini")).toBeInTheDocument();
    expect(screen.getByText("Zaman İçinde Sıralama")).toBeInTheDocument();
    expect(screen.queryByText(/[Aa]nket/)).not.toBeInTheDocument();
  });

  it("calls onOpenChange(false) when the close button is activated", () => {
    const onOpenChange = vi.fn();
    render(
      <ParticipantPopup
        ranked={{ entry: baseEntry, rank: 3 }}
        results={{}}
        revealCorrectness={false}
        onOpenChange={onOpenChange}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Kapat" }));
    // base-ui passes a second eventDetails argument alongside `open` — only
    // the boolean matters to callers, so match just the first arg.
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
  });
});

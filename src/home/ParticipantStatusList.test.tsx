import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ParticipantStatusList } from "./ParticipantStatusList";
import { Player } from "../profile/usePlayers";

const players: Player[] = [
  { uid: "z1", firstName: "Zeynep", lastName: "Kaya", photoURL: "", createdAt: 1 },
  { uid: "a1", firstName: "Ada", lastName: "Lovelace", photoURL: "", createdAt: 2 },
];

describe("ParticipantStatusList", () => {
  it("shows an empty state when there are no participants yet", () => {
    render(<ParticipantStatusList players={[]} submitterUids={new Set()} />);
    expect(screen.getByText("Henüz katılımcı yok.")).toBeInTheDocument();
    expect(screen.getByText("0 / 0")).toBeInTheDocument();
  });

  it("sorts participants alphabetically by full name", () => {
    render(<ParticipantStatusList players={players} submitterUids={new Set()} />);
    const names = screen.getAllByText(/Kaya|Lovelace/).map((el) => el.textContent);
    expect(names).toEqual(["Ada Lovelace", "Zeynep Kaya"]);
  });

  it("marks a submitted participant as such and reflects the count", () => {
    render(<ParticipantStatusList players={players} submitterUids={new Set(["a1"])} />);
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    expect(screen.getByLabelText("Tahminini gönderdi")).toBeInTheDocument();
    expect(screen.getByLabelText("Henüz göndermedi")).toBeInTheDocument();
  });
});

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { LeaderboardTable } from "./LeaderboardTable";

const PLAYERS = [
  { uid: "uid1", firstName: "Ada", lastName: "Lovelace", photoURL: "a.png", createdAt: 1 },
  { uid: "uid2", firstName: "Alan", lastName: "Turing", photoURL: "b.png", createdAt: 1 },
  { uid: "a", firstName: "Ada", lastName: "L", photoURL: "", createdAt: 1 },
  { uid: "b", firstName: "Alan", lastName: "T", photoURL: "", createdAt: 1 },
  { uid: "c", firstName: "Grace", lastName: "H", photoURL: "", createdAt: 1 },
];

describe("LeaderboardTable", () => {
  it("shows a fallback message when there are no entries", () => {
    render(<LeaderboardTable entries={[]} players={PLAYERS} />);
    expect(screen.getByText("Henüz tahmin gönderen olmadı.")).toBeInTheDocument();
  });

  it("renders each entry with name and points, in the given order", () => {
    render(
      <LeaderboardTable
        entries={[
          { uid: "uid1", firstName: "Ada", photoURL: "a.png", points: 9, ranking: [] },
          { uid: "uid2", firstName: "Alan", photoURL: "b.png", points: 6, ranking: [] },
        ]}
        players={PLAYERS}
      />
    );
    // Body rows only (skip the header row).
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[0]).toHaveTextContent("Ada Lovelace");
    expect(rows[0]).toHaveTextContent("9");
    expect(rows[1]).toHaveTextContent("Alan Turing");
    expect(rows[1]).toHaveTextContent("6");
  });

  it("shows first-name-only when a players entry has no lastName (logged-out data)", () => {
    render(
      <LeaderboardTable
        entries={[{ uid: "uid1", firstName: "Ada", photoURL: "a.png", points: 9, ranking: [] }]}
        players={[{ uid: "uid1", firstName: "Ada", photoURL: "a.png", createdAt: 1 }]}
      />
    );
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[0]).toHaveTextContent("Ada");
    expect(rows[0]).not.toHaveTextContent("Lovelace");
  });

  it("assigns a shared rank to tied points and renders it padded", () => {
    render(
      <LeaderboardTable
        entries={[
          { uid: "a", firstName: "Ada", photoURL: "", points: 9, ranking: [] },
          { uid: "b", firstName: "Alan", photoURL: "", points: 9, ranking: [] },
          { uid: "c", firstName: "Grace", photoURL: "", points: 4, ranking: [] },
        ]}
        players={PLAYERS}
      />
    );
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[0]).toHaveTextContent("01");
    expect(rows[1]).toHaveTextContent("01");
    expect(rows[2]).toHaveTextContent("03");
  });

  it("does not select a row on click before correctness is revealable", () => {
    const onSelectEntry = vi.fn();
    render(
      <LeaderboardTable
        entries={[{ uid: "uid1", firstName: "Ada", photoURL: "a.png", points: 9, ranking: ["arsenal"] }]}
        players={PLAYERS}
        revealCorrectness={false}
        onSelectEntry={onSelectEntry}
      />
    );
    fireEvent.click(screen.getAllByRole("row").slice(1)[0]);
    expect(onSelectEntry).not.toHaveBeenCalled();
  });

  it("selects a row by uid on click once correctness is revealable", () => {
    const onSelectEntry = vi.fn();
    render(
      <LeaderboardTable
        entries={[{ uid: "uid1", firstName: "Ada", photoURL: "a.png", points: 9, ranking: ["arsenal"] }]}
        players={PLAYERS}
        revealCorrectness
        onSelectEntry={onSelectEntry}
      />
    );
    fireEvent.click(screen.getAllByRole("row").slice(1)[0]);
    expect(onSelectEntry).toHaveBeenCalledWith("uid1");
  });

  it("selects a row via the keyboard (Enter)", () => {
    const onSelectEntry = vi.fn();
    render(
      <LeaderboardTable
        entries={[{ uid: "uid1", firstName: "Ada", photoURL: "a.png", points: 9, ranking: ["arsenal"] }]}
        players={PLAYERS}
        revealCorrectness
        onSelectEntry={onSelectEntry}
      />
    );
    fireEvent.keyDown(screen.getAllByRole("row").slice(1)[0], { key: "Enter" });
    expect(onSelectEntry).toHaveBeenCalledWith("uid1");
  });
});

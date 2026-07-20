import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PlayerList } from "./PlayerList";
import { TEAMS } from "../predictions/teams";

const players = [
  { uid: "uid1", firstName: "Ada", lastName: "Lovelace", photoURL: "a.png", createdAt: 1 },
  { uid: "uid2", firstName: "Alan", lastName: "Turing", photoURL: "b.png", createdAt: 2 },
];

describe("PlayerList", () => {
  it("shows only first names and a count when showFullNames is false", () => {
    render(<PlayerList players={players} showFullNames={false} />);
    expect(screen.getByText(/2 kişi katıldı/)).toBeInTheDocument();
    expect(screen.getByText(/Ada/)).toBeInTheDocument();
    expect(screen.queryByText(/Lovelace/)).not.toBeInTheDocument();
  });

  it("shows full names when showFullNames is true and no leaderboardEntries are given", () => {
    render(<PlayerList players={players} showFullNames={true} />);
    expect(screen.getByText(/Ada Lovelace/)).toBeInTheDocument();
    expect(screen.getByText(/Alan Turing/)).toBeInTheDocument();
    expect(screen.queryByText(/tahmin göndermedi/)).not.toBeInTheDocument();
  });

  it("reveals a submitter's ranking when leaderboardEntries includes them", () => {
    render(
      <PlayerList
        players={players}
        showFullNames={true}
        leaderboardEntries={[
          { uid: "uid1", firstName: "Ada", lastName: "Lovelace", photoURL: "a.png", points: 3, ranking: [TEAMS[0].id] },
        ]}
      />
    );
    expect(screen.getByText(new RegExp(TEAMS[0].name))).toBeInTheDocument();
  });

  it("marks a player as not having submitted when leaderboardEntries doesn't include them", () => {
    render(<PlayerList players={players} showFullNames={true} leaderboardEntries={[]} />);
    const items = screen.getAllByText(/tahmin göndermedi/);
    expect(items).toHaveLength(2);
  });
});

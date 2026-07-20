import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { LeaderboardTable } from "./LeaderboardTable";

describe("LeaderboardTable", () => {
  it("shows a fallback message when there are no entries", () => {
    render(<LeaderboardTable entries={[]} />);
    expect(screen.getByText("Henüz tahmin gönderen olmadı.")).toBeInTheDocument();
  });

  it("renders each entry with name and points, in the given order", () => {
    render(
      <LeaderboardTable
        entries={[
          { uid: "uid1", firstName: "Ada", lastName: "Lovelace", photoURL: "a.png", points: 9, ranking: [] },
          { uid: "uid2", firstName: "Alan", lastName: "Turing", photoURL: "b.png", points: 6, ranking: [] },
        ]}
      />
    );
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Ada Lovelace");
    expect(items[0]).toHaveTextContent("9 puan");
    expect(items[1]).toHaveTextContent("Alan Turing");
    expect(items[1]).toHaveTextContent("6 puan");
  });
});

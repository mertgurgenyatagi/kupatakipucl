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
    // Body rows only (skip the header row).
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[0]).toHaveTextContent("Ada Lovelace");
    expect(rows[0]).toHaveTextContent("9");
    expect(rows[1]).toHaveTextContent("Alan Turing");
    expect(rows[1]).toHaveTextContent("6");
  });

  it("assigns a shared rank to tied points and renders it padded", () => {
    render(
      <LeaderboardTable
        entries={[
          { uid: "a", firstName: "Ada", lastName: "L", photoURL: "", points: 9, ranking: [] },
          { uid: "b", firstName: "Alan", lastName: "T", photoURL: "", points: 9, ranking: [] },
          { uid: "c", firstName: "Grace", lastName: "H", photoURL: "", points: 4, ranking: [] },
        ]}
      />
    );
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[0]).toHaveTextContent("01");
    expect(rows[1]).toHaveTextContent("01");
    expect(rows[2]).toHaveTextContent("03");
  });
});

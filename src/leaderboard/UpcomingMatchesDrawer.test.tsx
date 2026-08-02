import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { UpcomingMatchesDrawer } from "./UpcomingMatchesDrawer";

vi.mock("../tournament/now", () => ({
  resolveNow: () => new Date("2026-08-01T00:00:00.000Z"),
}));

describe("UpcomingMatchesDrawer", () => {
  it("starts collapsed", () => {
    render(<UpcomingMatchesDrawer results={{}} />);
    expect(screen.getByRole("button", { name: "Yaklaşan maçları göster" })).toBeInTheDocument();
  });

  it("opens to reveal upcoming fixtures rendered via FixtureRow", () => {
    render(<UpcomingMatchesDrawer results={{}} />);
    fireEvent.click(screen.getByRole("button", { name: "Yaklaşan maçları göster" }));
    expect(screen.getByRole("button", { name: "Yaklaşan maçları kapat" })).toBeInTheDocument();
    // Real fixture short codes are 2-4 uppercase letters — at least one
    // fixture row must have rendered post-open.
    expect(screen.getAllByText(/^[A-Z]{2,4}$/).length).toBeGreaterThan(0);
  });
});

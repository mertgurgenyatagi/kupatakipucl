import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { LeaderboardHero } from "./LeaderboardHero";

vi.mock("../tournament/now", () => ({
  resolveNow: () => new Date("2026-08-01T00:00:00.000Z"),
}));

describe("LeaderboardHero", () => {
  it("forwards onSelectFixture through to the embedded drawer", () => {
    const onSelectFixture = vi.fn();
    render(<LeaderboardHero results={{}} onSelectFixture={onSelectFixture} />);
    fireEvent.click(screen.getByRole("button", { name: "Yaklaşan maçları göster" }));
    const [, firstRowButton] = screen.getAllByRole("button");
    fireEvent.click(firstRowButton);
    expect(onSelectFixture).toHaveBeenCalledTimes(1);
  });
});

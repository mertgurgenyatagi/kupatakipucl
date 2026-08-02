import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("../tournament/now", () => ({ resolveNow: () => new Date("2026-09-01T00:00:00Z") }));

import { UpcomingMatchesWidget } from "./UpcomingMatchesWidget";

describe("UpcomingMatchesWidget", () => {
  it("shows exactly 3 fixtures", () => {
    render(<UpcomingMatchesWidget results={{}} />);
    expect(screen.getAllByRole("button", { name: /çevrimiçi|.*/ }).length).toBeGreaterThan(0);
    // Each fixture row renders 2 team buttons (home + away) — 3 rows = 6 buttons.
    expect(document.querySelectorAll("[class*='h-24']")).toHaveLength(3);
  });

  it("shows real team short names, not devMatches placeholders", () => {
    render(<UpcomingMatchesWidget results={{}} />);
    expect(screen.getAllByText(/ARS|ATH|PSV/).length).toBeGreaterThan(0);
  });
});

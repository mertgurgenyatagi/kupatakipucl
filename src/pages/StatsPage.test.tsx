// src/pages/StatsPage.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StatsPage } from "./StatsPage";

describe("StatsPage", () => {
  it("always shows the unavailable placeholder — the page was cleared 2026-09-07", () => {
    render(<StatsPage />);
    expect(screen.getByText("Bu bölüm şu anda kullanılamıyor.")).toBeInTheDocument();
  });
});

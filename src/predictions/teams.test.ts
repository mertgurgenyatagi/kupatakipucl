import { describe, it, expect } from "vitest";
import { TEAMS } from "./teams";

describe("TEAMS", () => {
  it("has exactly 36 teams", () => {
    expect(TEAMS).toHaveLength(36);
  });

  it("has unique ids", () => {
    const ids = TEAMS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("is sorted alphabetically by name", () => {
    const sorted = [...TEAMS].sort((a, b) => a.name.localeCompare(b.name));
    expect(TEAMS.map((t) => t.name)).toEqual(sorted.map((t) => t.name));
  });
});

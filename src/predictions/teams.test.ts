import { describe, it, expect } from "vitest";
import { TEAMS, teamCrestSrc } from "./teams";
import { CLUB_BADGE_FILES } from "./clubBadgeSlugs";

describe("TEAMS", () => {
  it("has exactly 36 teams", () => {
    expect(TEAMS).toHaveLength(36);
  });

  it("has unique ids", () => {
    const ids = TEAMS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has unique short names, each short enough for a compact column", () => {
    const shortNames = TEAMS.map((t) => t.shortName);
    expect(new Set(shortNames).size).toBe(shortNames.length);
    shortNames.forEach((s) => expect(s.length).toBeLessThanOrEqual(4));
  });

  it("is sorted alphabetically by name", () => {
    const sorted = [...TEAMS].sort((a, b) => a.name.localeCompare(b.name));
    expect(TEAMS.map((t) => t.name)).toEqual(sorted.map((t) => t.name));
  });

  it("uses ids that are safe as URL path segments and filenames", () => {
    // The badge filename *is* the team id, so anything needing escaping
    // would break the crest request rather than fail here.
    TEAMS.forEach((t) => expect(t.id).toMatch(/^[a-z0-9-]+$/));
  });
});

describe("crests", () => {
  /**
   * The two directions matter for different reasons. A team with no badge
   * renders the shield placeholder in production — silent and easy to miss.
   * A badge with no team is a file shipped to every visitor that nothing can
   * ever request. Both were true before the 2026-08-27 team swap, when
   * crests were hash-assigned from a 29-badge pool to a 36-team placeholder
   * list.
   */
  it("gives every team its own badge", () => {
    const missing = TEAMS.filter((t) => !CLUB_BADGE_FILES[t.id]).map((t) => t.id);
    expect(missing).toEqual([]);
  });

  it("ships no badge that belongs to no team", () => {
    const ids = new Set(TEAMS.map((t) => t.id));
    const orphaned = Object.keys(CLUB_BADGE_FILES).filter((slug) => !ids.has(slug));
    expect(orphaned).toEqual([]);
  });

  it("resolves each crest to its own team's file, not a shared one", () => {
    const srcs = TEAMS.map((t) => teamCrestSrc(t.id));
    expect(new Set(srcs).size).toBe(TEAMS.length);
    expect(teamCrestSrc("real-madrid")).toBe("/club-badges/real-madrid.svg");
    // Rasterised because the source SVG was 6.5MB of embedded bitmap.
    expect(teamCrestSrc("real-betis")).toBe("/club-badges/real-betis.webp");
  });
});

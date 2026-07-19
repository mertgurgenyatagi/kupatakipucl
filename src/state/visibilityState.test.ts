import { describe, it, expect } from "vitest";
import { getVisibilityState } from "./visibilityState";

describe("getVisibilityState", () => {
  it("returns NST_NLI when pre-tournament and logged out", () => {
    expect(getVisibilityState(false, "pre")).toBe("NST_NLI");
  });

  it("returns NST_LI when pre-tournament and logged in", () => {
    expect(getVisibilityState(true, "pre")).toBe("NST_LI");
  });

  it("returns ST_NLI when post-tournament and logged out", () => {
    expect(getVisibilityState(false, "post")).toBe("ST_NLI");
  });

  it("returns ST_LI when post-tournament and logged in", () => {
    expect(getVisibilityState(true, "post")).toBe("ST_LI");
  });
});

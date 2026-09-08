import { describe, it, expect } from "vitest";
import { PREDICTION_GRACE_END_ISO, isGracePeriodOpen } from "./deadlines";

describe("isGracePeriodOpen", () => {
  it("is open before the grace end", () => {
    const before = new Date(new Date(PREDICTION_GRACE_END_ISO).getTime() - 1000);
    expect(isGracePeriodOpen(before)).toBe(true);
  });

  it("is closed at and after the grace end", () => {
    const at = new Date(PREDICTION_GRACE_END_ISO);
    const after = new Date(new Date(PREDICTION_GRACE_END_ISO).getTime() + 1000);
    expect(isGracePeriodOpen(at)).toBe(false);
    expect(isGracePeriodOpen(after)).toBe(false);
  });
});

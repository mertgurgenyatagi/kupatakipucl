import { describe, it, expect } from "vitest";
import { boundaryBand, boundaryBandRole } from "./predictionBoundary";

describe("boundaryBand", () => {
  it("spans two rows either side of a middle index", () => {
    expect(boundaryBand(10, 36)).toEqual([8, 12]);
  });

  it("clamps at the top of the list", () => {
    expect(boundaryBand(0, 36)).toEqual([0, 2]);
    expect(boundaryBand(1, 36)).toEqual([0, 3]);
  });

  it("clamps at the bottom of the list", () => {
    expect(boundaryBand(35, 36)).toEqual([33, 35]);
    expect(boundaryBand(34, 36)).toEqual([32, 35]);
  });
});

describe("boundaryBandRole", () => {
  it("marks the band's first row as top and last row as bottom", () => {
    expect(boundaryBandRole(8, 10, 36)).toBe("top");
    expect(boundaryBandRole(12, 10, 36)).toBe("bottom");
  });

  it("marks everything in between, including the hovered row itself, as middle", () => {
    expect(boundaryBandRole(9, 10, 36)).toBe("middle");
    expect(boundaryBandRole(10, 10, 36)).toBe("middle");
    expect(boundaryBandRole(11, 10, 36)).toBe("middle");
  });

  it("is none for a row outside the band", () => {
    expect(boundaryBandRole(7, 10, 36)).toBe("none");
    expect(boundaryBandRole(13, 10, 36)).toBe("none");
  });

  it("collapses top and bottom onto the same row when the band clips at the list's edge", () => {
    expect(boundaryBandRole(0, 0, 36)).toBe("top");
    expect(boundaryBandRole(2, 0, 36)).toBe("bottom");
  });
});

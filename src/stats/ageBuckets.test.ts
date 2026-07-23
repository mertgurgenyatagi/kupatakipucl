import { describe, it, expect } from "vitest";
import { AGE_BUCKETS, bucketAge, computeAgeDistribution } from "./ageBuckets";

describe("bucketAge", () => {
  it("buckets below 20 and above 27 into the overflow buckets, and 20-27 into their exact bucket", () => {
    expect(bucketAge(15)).toBe("<20");
    expect(bucketAge(19)).toBe("<20");
    expect(bucketAge(20)).toBe("20");
    expect(bucketAge(23)).toBe("23");
    expect(bucketAge(27)).toBe("27");
    expect(bucketAge(28)).toBe(">27");
    expect(bucketAge(40)).toBe(">27");
  });
});

describe("computeAgeDistribution", () => {
  it("always returns all 10 buckets in fixed order and counts ages correctly", () => {
    expect(computeAgeDistribution([]).map((b) => b.label)).toEqual(AGE_BUCKETS);

    const out = computeAgeDistribution([19, 20, 20, 30]);
    expect(out.find((b) => b.label === "<20")?.count).toBe(1);
    expect(out.find((b) => b.label === "20")?.count).toBe(2);
    expect(out.find((b) => b.label === ">27")?.count).toBe(1);
    expect(out.find((b) => b.label === "21")?.count).toBe(0);
  });
});

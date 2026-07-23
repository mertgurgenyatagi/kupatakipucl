import { describe, it, expect } from "vitest";
import { AGE_BUCKETS, bucketAge, computeAgeDistribution } from "./ageBuckets";

describe("bucketAge", () => {
  it("buckets ages into the right range, including exact boundaries", () => {
    expect(bucketAge(17)).toBe("<18");
    expect(bucketAge(18)).toBe("18-20");
    expect(bucketAge(20)).toBe("18-20");
    expect(bucketAge(21)).toBe("21-25");
    expect(bucketAge(25)).toBe("21-25");
    expect(bucketAge(26)).toBe("26-30");
    expect(bucketAge(30)).toBe("26-30");
    expect(bucketAge(31)).toBe(">30");
  });
});

describe("computeAgeDistribution", () => {
  it("always returns all 5 buckets in fixed order and counts ages correctly", () => {
    expect(computeAgeDistribution([]).map((b) => b.label)).toEqual(AGE_BUCKETS);

    const out = computeAgeDistribution([17, 18, 19, 30, 31]);
    expect(out.find((b) => b.label === "<18")?.count).toBe(1);
    expect(out.find((b) => b.label === "18-20")?.count).toBe(2);
    expect(out.find((b) => b.label === "26-30")?.count).toBe(1);
    expect(out.find((b) => b.label === ">30")?.count).toBe(1);
    expect(out.find((b) => b.label === "21-25")?.count).toBe(0);
  });
});

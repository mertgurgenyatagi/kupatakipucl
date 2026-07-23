export const AGE_BUCKETS = ["<20", "20", "21", "22", "23", "24", "25", "26", "27", ">27"];

export function bucketAge(age: number): string {
  if (age < 20) return "<20";
  if (age > 27) return ">27";
  return String(age);
}

export interface AgeBucketCount {
  label: string;
  count: number;
}

export function computeAgeDistribution(ages: number[]): AgeBucketCount[] {
  const counts = new Map<string, number>(AGE_BUCKETS.map((label) => [label, 0]));
  ages.forEach((age) => {
    const bucket = bucketAge(age);
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  });
  return AGE_BUCKETS.map((label) => ({ label, count: counts.get(label) ?? 0 }));
}

export const AGE_BUCKETS = ["<18", "18-20", "21-25", "26-30", ">30"];

export function bucketAge(age: number): string {
  if (age < 18) return "<18";
  if (age <= 20) return "18-20";
  if (age <= 25) return "21-25";
  if (age <= 30) return "26-30";
  return ">30";
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

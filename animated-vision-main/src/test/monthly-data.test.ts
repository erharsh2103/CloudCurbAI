import { describe, expect, it } from "vitest";
import { monthly } from "@/lib/data";
import { rawMetrics } from "@/lib/raw-cloud";

describe("monthly fleet trend history", () => {
  it("covers the previous Nov–Apr period and the current May–Oct window", () => {
    expect(monthly).toHaveLength(12);
    expect(monthly.slice(0, 6).map(({ m }) => m)).toEqual([
      "Nov",
      "Dec",
      "Jan",
      "Feb",
      "Mar",
      "Apr",
    ]);
    expect(monthly.slice(6).map(({ m }) => m)).toEqual(["May", "Jun", "Jul", "Aug", "Sep", "Oct"]);
  });

  it("ends on the current fleet totals", () => {
    expect(monthly.at(-1)).toMatchObject({
      cost: rawMetrics.monthlyCost,
      co2: rawMetrics.carbonTonnes,
    });
  });

  it("trends gently downward without implausible month-to-month jumps", () => {
    for (let index = 1; index < monthly.length; index++) {
      const previous = monthly[index - 1]!;
      const current = monthly[index]!;
      expect(Math.abs(current.co2 / previous.co2 - 1)).toBeLessThan(0.05);
      expect(Math.abs(current.cost / previous.cost - 1)).toBeLessThan(0.05);
    }
    expect(monthly.at(-1)!.co2).toBe(Math.min(...monthly.map(({ co2 }) => co2)));
    expect(monthly.at(-1)!.cost).toBe(Math.min(...monthly.map(({ cost }) => cost)));
  });
});

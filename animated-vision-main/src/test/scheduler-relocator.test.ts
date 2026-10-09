import { describe, expect, it } from "vitest";
import { relocationRecommendation, scheduleRecommendations } from "@/lib/scheduler-relocator";

describe("Scheduler and Relocator recommendations", () => {
  it("uses known workloads and computes stable scheduler impact estimates", () => {
    expect(scheduleRecommendations.map(({ resource }) => resource.id)).toEqual(["r1", "r9", "r10"]);
    expect(scheduleRecommendations[0]).toMatchObject({
      currentSchedule: "4:00 PM",
      recommendedSchedule: "4:00 AM",
      expectedCarbonReductionPercent: 35,
      expectedCostReductionPercent: 35,
    });
    expect(
      scheduleRecommendations.every(
        (item) =>
          item.expectedCarbonReductionKg > 0 &&
          item.expectedCostReductionInr > 0 &&
          item.resource.risk !== "High",
      ),
    ).toBe(true);
  });

  it("selects a lower-carbon region and calculates the relocation cost and carbon changes", () => {
    expect(relocationRecommendation.resource.id).toBe("r5");
    expect(relocationRecommendation.sourceRegion.region).toBe("ap-southeast-1");
    expect(relocationRecommendation.target.region).toBe("eu-north-1");
    expect(relocationRecommendation.target.g).toBeLessThan(relocationRecommendation.sourceRegion.g);
    expect(relocationRecommendation.carbonIntensityReductionPercent).toBe(94.6);
    expect(relocationRecommendation.estimatedCostChangePercent).toBe(7.4);
    expect(relocationRecommendation.resource.risk).toBe("High");
  });
});

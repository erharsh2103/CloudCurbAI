import { describe, expect, it } from "vitest";
import {
  rawMetrics,
  rawTelemetry,
  canOptimizeResource,
  resourceCounts,
  resourceComposition,
  resourceCompositionDetails,
  resourceIntelligence,
  resourceIntelligenceCategories,
  filterResourceSummary,
  allResources,
  resourceSummary,
  calculateOptimizationProjection,
  optimizationProjection,
  impactSummary,
  calculateMonthlyCarbonTrend,
} from "@/lib/raw-cloud";

describe("Reference cloud simulation", () => {
  it("starts with 500 resources", () => expect(rawMetrics.resources).toBe(500));
  it("starts with ₹1.86 Cr monthly spend", () => expect(rawMetrics.monthlyCost).toBe(18_600_000));
  it("starts with 48.6 tonnes CO₂e", () => expect(rawMetrics.carbonTonnes).toBe(48.6));
  it("anchors the monthly CO₂ trend to the current fleet estimate", () => {
    const trend = calculateMonthlyCarbonTrend(
      [
        { m: "Sep", co2: 50 },
        { m: "Oct", co2: 40 },
      ],
      rawMetrics.carbonTonnes,
    );

    expect(trend).toEqual([
      { m: "Sep", tonnes: 60.75 },
      { m: "Oct", tonnes: rawMetrics.carbonTonnes },
    ]);
  });
  it("applies verified savings to the current month only", () => {
    const trend = calculateMonthlyCarbonTrend(
      [
        { m: "Sep", co2: 50.8 },
        { m: "Oct", co2: 48.6 },
      ],
      48.3,
    );

    expect(trend).toEqual([
      { m: "Sep", tonnes: 50.8 },
      { m: "Oct", tonnes: 48.3 },
    ]);
  });
  it("rejects an invalid carbon baseline rather than displaying misleading values", () => {
    expect(() => calculateMonthlyCarbonTrend([], rawMetrics.carbonTonnes)).toThrow(RangeError);
    expect(() =>
      calculateMonthlyCarbonTrend([{ m: "Oct", co2: 0 }], rawMetrics.carbonTonnes),
    ).toThrow(RangeError);
  });
  it("calculates AI projection rates from eligible non-production resources", () => {
    const projection = calculateOptimizationProjection([
      {
        environment: "Development",
        status: "Idle",
        monthlyCost: 100,
        carbonImpact: 10,
      },
      {
        environment: "Development",
        status: "Oversized",
        monthlyCost: 100,
        carbonImpact: 10,
      },
      {
        environment: "Production",
        status: "Idle",
        monthlyCost: 100,
        carbonImpact: 10,
      },
      {
        environment: "Development",
        status: "Protected",
        monthlyCost: 100,
        carbonImpact: 10,
      },
    ]);

    expect(projection).toEqual({
      costReductionPercent: 26,
      energyReductionPercent: 26,
      carbonReductionPercent: 26,
      energyBaselineIndex: 100,
    });
    expect(optimizationProjection.costReductionPercent).toBeGreaterThan(0);
    expect(optimizationProjection.carbonReductionPercent).toBeGreaterThan(0);
  });
  it("derives the 12-month impact summary from the monthly trend", () => {
    expect(impactSummary).toMatchObject({
      carbonAvoidedTonnes: 63.5,
      energySavedMwh: 181.4,
      costSavedInr: 23_860_000,
      actionsExecuted: 386,
      slaMaintainedPercent: 99.98,
    });
    // Savings over a year stay well below a year of spend and emissions.
    expect(impactSummary.costSavedInr).toBeLessThan(rawMetrics.monthlyCost * 12);
    expect(impactSummary.carbonAvoidedTonnes).toBeLessThan(rawMetrics.carbonTonnes * 12);
  });
  it("projects meaningful but realistic savings for the flagged fleet", () => {
    expect(optimizationProjection.costReductionPercent).toBeGreaterThanOrEqual(10);
    expect(optimizationProjection.costReductionPercent).toBeLessThan(30);
    expect(optimizationProjection.carbonReductionPercent).toBeGreaterThanOrEqual(5);
  });
  it("protects 100 percent of production", () => expect(rawMetrics.productionProtected).toBe(100));
  it("shows 109 waste detected resources", () => expect(rawMetrics.wasteDetected).toBe(109));
  it("counts 45 idle resources", () => expect(resourceCounts.idle).toBe(45));
  it("counts 64 oversized resources", () => expect(resourceCounts.oversized).toBe(64));
  it("counts 31 protected resources", () => expect(resourceCounts.protected).toBe(31));
  it("composes all 500 resources", () =>
    expect(resourceComposition.reduce((sum, r) => sum + r.value, 0)).toBe(500));
  it("composes the full fleet across the six intelligence workload categories", () => {
    expect(resourceCompositionDetails.map((item) => item.category)).toEqual(
      resourceIntelligenceCategories,
    );
    expect(resourceCompositionDetails.every((item) => item.count > 0)).toBe(true);
    expect(resourceCompositionDetails.reduce((sum, item) => sum + item.count, 0)).toBe(500);
    expect(resourceCompositionDetails.every((item) => item.utilization >= 0)).toBe(true);
    expect(resourceCompositionDetails.every((item) => item.carbonImpact >= 0)).toBe(true);
  });
  it("provides complete simulated intelligence and reconciles fleet totals", () => {
    expect(resourceIntelligence).toHaveLength(500);
    expect(
      resourceIntelligence.every(
        (resource) =>
          resource.owner.length > 0 &&
          resource.utilization >= 0 &&
          resource.utilization <= 100 &&
          resource.monthlyCost > 0 &&
          resource.carbonImpact > 0,
      ),
    ).toBe(true);
    expect(
      resourceIntelligence.reduce((sum, resource) => sum + resource.monthlyCost, 0),
    ).toBeCloseTo(rawMetrics.monthlyCost, 2);
    expect(
      resourceIntelligence.reduce((sum, resource) => sum + resource.carbonImpact, 0),
    ).toBeCloseTo(rawMetrics.carbonTonnes * 1000, 1);
  });
  it("generates exactly 500 resources with unique names", () => {
    expect(allResources).toHaveLength(500);
    expect(new Set(allResources.map((r) => r.name)).size).toBe(500);
  });
  it("matches the composition counts across the full dataset", () => {
    const by = (status: string) => allResources.filter((r) => r.status === status).length;
    expect(by("IDLE")).toBe(resourceCounts.idle);
    expect(by("OVERSIZED")).toBe(resourceCounts.oversized);
    expect(by("PROTECTED")).toBe(resourceCounts.protected);
    expect(allResources.length - by("IDLE") - by("OVERSIZED") - by("PROTECTED")).toBe(360);
  });
  it("keeps the reference rows in the full dataset", () => {
    for (const name of [
      ...rawTelemetry.map((r) => r.name),
      "vm-dev-017",
      "db-prod-003",
      "ml-prod-014",
    ]) {
      expect(allResources.some((r) => r.name === name)).toBe(true);
    }
  });
  it("filters the resource table by name, environment and status", () => {
    expect(filterResourceSummary("VM-DEV", "Development", "Idle").map((r) => r.name)).toEqual([
      "vm-dev-17",
      "vm-dev-21",
      "vm-dev-017",
    ]);
    const productionProtected = filterResourceSummary("", "Production", "Protected");
    expect(productionProtected).toHaveLength(resourceCounts.protected);
    expect(productionProtected.map((r) => r.name)).toEqual(
      expect.arrayContaining(["vm-prod-01", "db-prod-03", "db-prod-003", "ml-prod-014"]),
    );
    expect(filterResourceSummary("missing", "All", "All")).toEqual([]);
  });
  it("uses the friendly Unused label for unattached resources in the resource filter", () => {
    const unused = filterResourceSummary("", "All", "Unused");
    expect(unused).toHaveLength(
      allResources.filter((resource) => resource.status === "ORPHANED").length,
    );
    expect(unused.every((resource) => resource.status === "Unused")).toBe(true);
    expect(filterResourceSummary("", "Unclassified", "All")).toHaveLength(
      allResources.filter((resource) => resource.environment === "ORPHANED").length,
    );
  });
  it("never optimizes protected production resources in the full dataset", () => {
    expect(
      allResources.filter((r) => r.status === "PROTECTED").every((r) => r.environment === "PROD"),
    ).toBe(true);
    expect(allResources.filter(canOptimizeResource).some((r) => r.status === "PROTECTED")).toBe(
      false,
    );
  });
  it("labels every resource environment for the Resource Intelligence view", () => {
    expect(
      resourceSummary.every(
        (r) =>
          !["PROD", "DEV", "TEST", "STAGE", "NON-PROD", "FLEXIBLE", "ORPHANED"].includes(
            r.environment,
          ),
      ),
    ).toBe(true);
  });
  it("never optimizes protected production resources", () => {
    expect(rawTelemetry.filter(canOptimizeResource).map((r) => r.name)).not.toContain("vm-prod-01");
    expect(canOptimizeResource({ environment: "PROD", status: "IDLE" })).toBe(false);
    expect(canOptimizeResource({ environment: "DEV", status: "IDLE" })).toBe(true);
  });
});

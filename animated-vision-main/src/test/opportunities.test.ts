import { describe, expect, it } from "vitest";
import {
  categories,
  getOpportunityProjection,
  initialActions,
  isCurbPilotEligible,
  resources,
} from "@/lib/data";
import {
  createOpportunityAction,
  createExecutionResult,
  getDecisionAccuracy,
  getVerifiedImpact,
  getLearningNote,
  getAuditVerdict,
  getFeedbackSummary,
  recordChangeFeedback,
  restoreActions,
  transitionAction,
} from "@/lib/pilot-state";

describe("simulated AI opportunities", () => {
  it("covers the requested opportunity types", () => {
    expect(categories).toEqual(
      expect.arrayContaining([
        "Idle",
        "Oversized",
        "Unused",
        "AI/GPU underutilized",
        "High carbon",
        "Inefficient AI workload",
        "Scheduling opportunity",
      ]),
    );
    expect(new Set(resources.map(({ category }) => category))).toEqual(new Set(categories));
  });

  it("provides complete impact and recommendation details for every opportunity", () => {
    expect(
      resources.every(
        (resource) =>
          resource.waste >= 0 &&
          resource.carbon > 0 &&
          resource.cost > 0 &&
          resource.confidence > 0 &&
          resource.why.length > 0 &&
          resource.action.length > 0,
      ),
    ).toBe(true);
  });

  it("keeps high-risk actions out of the simulated CurbPilot handoff", () => {
    expect(isCurbPilotEligible({ risk: "Low" })).toBe(true);
    expect(isCurbPilotEligible({ risk: "Medium" })).toBe(true);
    expect(isCurbPilotEligible({ risk: "High" })).toBe(false);
  });

  it("projects positive cost, energy and carbon savings without exceeding the baseline", () => {
    for (const resource of resources) {
      const projection = getOpportunityProjection(resource);
      expect(projection.costSaving).toBeGreaterThan(0);
      expect(projection.energySavingKwh).toBeGreaterThan(0);
      expect(projection.carbonReduction).toBeGreaterThan(0);
      expect(projection.afterCost).toBeLessThan(resource.cost);
      expect(projection.afterCarbon).toBeLessThan(resource.carbon);
      expect(projection.afterEnergyKwh).toBeLessThan(projection.beforeEnergyKwh);
    }
  });

  it("records only verified simulated actions in dashboard impact totals", () => {
    const opportunity = resources[0]!;
    const action = createOpportunityAction(opportunity);
    const completed = createExecutionResult(action, false);
    const impact = getVerifiedImpact([
      { ...action, status: "Executing" },
      { ...action, status: "Failed" },
      completed,
    ]);
    const projection = getOpportunityProjection(opportunity);

    expect(impact).toEqual({
      actionCount: 1,
      costSavingInr: completed.costSavingInr,
      carbonSavingKg: completed.carbonSavingKg,
      energySavingKwh: completed.energySavingKwh,
    });
    expect(completed.expectedCostSavingInr).toBe(projection.costSaving);
  });

  it("does not double count verified actions for the same resource", () => {
    const opportunity = resources.find(({ name }) => name === initialActions[4]!.target)!;
    const first = createExecutionResult(createOpportunityAction(opportunity), false);
    const second = { ...first, id: "duplicate-action" };
    const impact = getVerifiedImpact([first, second]);

    expect(impact.actionCount).toBe(1);
    expect(impact.costSavingInr).toBe(first.costSavingInr);
  });

  it("marks unfinished executions as failed when restoring the saved simulation", () => {
    const action = createOpportunityAction(resources[0]!);
    const [executing, verifying, verified] = restoreActions([
      { ...action, status: "Executing", progress: 70 },
      { ...action, status: "Verifying", progress: 100 },
      { ...action, status: "Verified ✓", progress: 100 },
    ]);

    expect(executing).toMatchObject({
      status: "Failed",
      failureReason: expect.stringContaining("interrupted"),
    });
    expect(executing?.progress).toBeUndefined();
    expect(verifying?.status).toBe("Failed");
    expect(verified?.status).toBe("Verified ✓");
  });

  it("compares actual outcomes against expected values for success, partial results and failure", () => {
    const lowRisk = createOpportunityAction(resources.find(({ category }) => category === "Idle")!);
    const mediumRisk = createOpportunityAction(resources.find(({ risk }) => risk === "Medium")!);
    const successful = createExecutionResult(lowRisk, false);
    const partial = createExecutionResult(mediumRisk, false);
    const unsuccessful = createExecutionResult(mediumRisk, true);

    expect(successful).toMatchObject({
      outcome: "Successful",
      slaResult: expect.stringContaining("Maintained"),
      learningStatus: "Ready",
    });
    expect(successful.decisionAccuracyPct).toBe(
      Math.round(
        ((successful.costSavingInr! / successful.expectedCostSavingInr! +
          successful.carbonSavingKg! / successful.expectedCarbonSavingKg!) /
          2) *
          100,
      ),
    );
    expect(successful.costSavingInr).toBeLessThan(successful.expectedCostSavingInr!);
    expect(partial).toMatchObject({
      outcome: "Partially successful",
      slaResult: expect.stringContaining("Maintained"),
      decisionAccuracyPct: 71,
    });
    expect(unsuccessful).toMatchObject({
      outcome: "Unsuccessful",
      status: "Failed",
      costSavingInr: 0,
      carbonSavingKg: 0,
      energySavingKwh: 0,
      decisionAccuracyPct: 0,
      learningStatus: "Ready",
    });
    expect(getLearningNote(partial)).toContain("partial savings");
    expect(getLearningNote(unsuccessful)).toContain("lower confidence");
    expect(getDecisionAccuracy([successful, partial, unsuccessful])).toBe(
      Math.round((successful.decisionAccuracyPct! + partial.decisionAccuracyPct!) / 3),
    );
  });

  it("restores an accurate outcome and feedback state", () => {
    const lowRiskIdle = resources.find(
      ({ category, risk }) => category === "Idle" && risk === "Low",
    )!;
    const successful = createExecutionResult(createOpportunityAction(lowRiskIdle), false);
    const [restored] = restoreActions([
      { ...successful, learningStatus: "Learned", learningNote: "Recorded learning feedback." },
    ]);

    expect(restored?.outcome).toBe("Successful");
    expect(restored?.learningStatus).toBe("Learned");
    expect(restored?.learningNote).toBe("Recorded learning feedback.");
    expect(getDecisionAccuracy([restored!])).toBe(restored?.decisionAccuracyPct);
  });

  it("records detection, approval, execution, verification and learning history", () => {
    const resource = resources.find(
      ({ category, risk }) => category === "Oversized" && risk === "Medium",
    )!;
    const requested = createOpportunityAction(resource);
    const executing = transitionAction(
      requested,
      { ...requested, status: "Executing" },
      "2026-10-08T01:00:00.000Z",
    );
    const verifying = transitionAction(
      executing,
      { ...executing, status: "Verifying" },
      "2026-10-08T01:00:02.500Z",
    );
    const outcome = createExecutionResult(verifying, false);
    const verified = transitionAction(verifying, outcome, "2026-10-08T01:00:03.000Z");

    expect(verified.history?.map(({ event }) => event)).toEqual([
      "Opportunity detected",
      "Change requested",
      "Approval requested",
      "Change approved and execution started",
      "Execution completed",
      "Result verified · Partially successful",
    ]);
    expect(verified.executionTimeMs).toBe(2500);
    expect(verified.history?.at(-1)?.details).toContain(verified.slaResult);
  });

  it("records rejection with no simulated execution", () => {
    const resource = resources.find(
      ({ category, risk }) => category === "Oversized" && risk === "Medium",
    )!;
    const requested = createOpportunityAction(resource);
    const rejected = transitionAction(
      requested,
      { ...requested, status: "Rejected" },
      "2026-10-08T01:02:00.000Z",
    );

    expect(rejected.history?.at(-1)).toMatchObject({
      actor: "User",
      event: "Recommendation rejected",
      details: expect.stringContaining("no execution"),
    });
    expect(rejected.executionTimeMs).toBeUndefined();
  });

  it("calculates savings by action type", () => {
    const unused = resources.find(({ category }) => category === "Unused")!;
    const relocation = resources.find(({ targetRegion }) => targetRegion)!;

    expect(getOpportunityProjection(unused).costSaving).toBe(unused.cost);
    expect(getOpportunityProjection(relocation).carbonReductionRate).toBeGreaterThan(
      getOpportunityProjection(relocation).costReductionRate,
    );
  });

  it("audits completed changes as good, mixed or bad", () => {
    const lowRisk = createOpportunityAction(resources.find(({ category }) => category === "Idle")!);
    const mediumRisk = createOpportunityAction(resources.find(({ risk }) => risk === "Medium")!);

    expect(getAuditVerdict(lowRisk)).toBeNull();
    expect(getAuditVerdict(createExecutionResult(lowRisk, false))?.verdict).toBe("Good change");
    expect(getAuditVerdict(createExecutionResult(mediumRisk, false))?.verdict).toBe("Mixed result");
    expect(getAuditVerdict(createExecutionResult(mediumRisk, true))?.verdict).toBe("Bad change");
  });

  it("records user feedback on a completed change for learning", () => {
    const completed = createExecutionResult(
      createOpportunityAction(resources.find(({ category }) => category === "Idle")!),
      false,
    );
    const rated = recordChangeFeedback(completed, "Bad", "2026-10-08T02:00:00.000Z");

    expect(rated).toMatchObject({ feedback: "Bad", learningStatus: "Learning" });
    expect(rated.history?.at(-1)).toMatchObject({
      actor: "User",
      event: "Change audited · rated bad",
    });
    expect(getLearningNote(rated)).toContain("rated this change bad");
    expect(getFeedbackSummary([rated, completed])).toEqual({ good: 0, bad: 1, awaiting: 1 });
    expect(createExecutionResult(rated, false).feedback).toBeUndefined();
  });
});

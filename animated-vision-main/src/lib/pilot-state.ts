import { useSyncExternalStore } from "react";
import {
  CARBON_KG_PER_KWH,
  getOpportunityProjection,
  initialActions,
  resources,
  type Action,
  type ActionHistoryEvent,
  type ChangeFeedback,
  type Res,
} from "@/lib/data";
import { formatInr, formatNumber } from "@/lib/format";

// v2 stores money in rupees; v1 records held dollar amounts and are ignored.
const STORAGE_KEY = "cloudcurb-curbpilot-simulation-v2";
const CHANGE_EVENT = "cloudcurb-curbpilot-simulation-change";
const verifiedStatus = "Verified ✓";

export function formatSavingLabel(costInr: number, carbonKg: number) {
  return `Expected saving: ${formatInr(costInr)}/mo · ${formatNumber(carbonKg)} kg CO₂e/mo`;
}

function withResourceImpact(action: Action, resource: Res | undefined): Action {
  if (!resource) return action;
  const projection = getOpportunityProjection(resource);
  const expectedCostSavingInr =
    action.expectedCostSavingInr ?? action.costSavingInr ?? projection.costSaving;
  const expectedCarbonSavingKg =
    action.expectedCarbonSavingKg ?? action.carbonSavingKg ?? projection.carbonReduction;
  const seedStart = new Date("2026-10-07T08:00:00.000Z");
  const seededHistory: ActionHistoryEvent[] = [
    {
      at: seedStart.toISOString(),
      actor: "CurbBrain",
      event: "Opportunity detected",
      details: resource.why,
    },
    {
      at: new Date(seedStart.getTime() + 3 * 60_000).toISOString(),
      actor: "CurbBrain",
      event: "Change requested",
      details: action.title,
    },
  ];
  const seededFinalEvent =
    action.status === "Awaiting approval"
      ? {
          actor: "CurbPilot",
          event: "Approval requested",
          details: "Medium-risk action is waiting for user review.",
        }
      : action.status === "Blocked"
        ? {
            actor: "CurbPilot policy",
            event: "Change blocked",
            details: "High-risk action requires a manual change ticket.",
          }
        : action.status === "Queued"
          ? {
              actor: "CurbPilot",
              event: "Queued for auto-execution",
              details: "Low-risk change is queued under the auto-execute policy.",
            }
          : undefined;
  const history =
    action.history ??
    (seededFinalEvent
      ? [
          ...seededHistory,
          {
            ...seededFinalEvent,
            at: new Date(seedStart.getTime() + 5 * 60_000).toISOString(),
          },
        ]
      : seededHistory);
  return {
    ...action,
    saving: formatSavingLabel(expectedCostSavingInr, expectedCarbonSavingKg),
    expectedCostSavingInr,
    expectedCarbonSavingKg,
    expectedEnergySavingKwh:
      action.expectedEnergySavingKwh ??
      action.energySavingKwh ??
      Math.round(expectedCarbonSavingKg / CARBON_KG_PER_KWH),
    history,
    explanation: resource.why,
    confidence: resource.confidence,
  };
}

export function createOpportunityAction(resource: Res): Action {
  const projection = getOpportunityProjection(resource);
  const detectedAt = new Date().toISOString();
  return {
    id: `opportunity-${resource.id}`,
    title: resource.action,
    target: resource.name,
    risk: resource.risk,
    status: resource.risk === "Low" ? "Queued" : "Awaiting approval",
    saving: formatSavingLabel(projection.costSaving, projection.carbonReduction),
    expectedCostSavingInr: projection.costSaving,
    expectedCarbonSavingKg: projection.carbonReduction,
    expectedEnergySavingKwh: projection.energySavingKwh,
    history: [
      {
        at: detectedAt,
        actor: "CurbBrain",
        event: "Opportunity detected",
        details: resource.why,
      },
      {
        at: new Date(Date.now() + 1).toISOString(),
        actor: "CurbBrain",
        event: "Change requested",
        details: resource.action,
      },
      ...(resource.risk === "Medium"
        ? [
            {
              at: new Date(Date.now() + 2).toISOString(),
              actor: "CurbPilot",
              event: "Approval requested",
              details: "Medium-risk action is waiting for user review.",
            },
          ]
        : [
            {
              at: new Date(Date.now() + 2).toISOString(),
              actor: "CurbPilot",
              event: "Queued for auto-execution",
              details: "Low-risk change is queued under the auto-execute policy.",
            },
          ]),
    ],
    explanation: resource.why,
    confidence: resource.confidence,
  };
}

function createInitialState(): PilotState {
  return {
    actions: initialActions.map((seed) =>
      withResourceImpact(
        { ...seed, saving: "" },
        resources.find((resource) => resource.name === seed.target),
      ),
    ),
  };
}

export type PilotState = { actions: Action[] };
const serverState = createInitialState();
let currentState = serverState;
let currentSerialized: string | null | undefined;

function isOptional(value: unknown, type: "string" | "number") {
  return value === undefined || typeof value === type;
}

function isAction(value: unknown): value is Action {
  if (!value || typeof value !== "object") return false;
  const action = value as { [Key in keyof Action]?: unknown };
  return (
    typeof action.id === "string" &&
    typeof action.title === "string" &&
    typeof action.target === "string" &&
    (action.risk === "Low" || action.risk === "Medium" || action.risk === "High") &&
    typeof action.status === "string" &&
    typeof action.saving === "string" &&
    isOptional(action.costSavingInr, "number") &&
    isOptional(action.carbonSavingKg, "number") &&
    isOptional(action.energySavingKwh, "number") &&
    isOptional(action.expectedCostSavingInr, "number") &&
    isOptional(action.expectedCarbonSavingKg, "number") &&
    isOptional(action.expectedEnergySavingKwh, "number") &&
    (action.outcome === undefined ||
      action.outcome === "Successful" ||
      action.outcome === "Partially successful" ||
      action.outcome === "Unsuccessful") &&
    isOptional(action.slaResult, "string") &&
    (action.decisionAccuracyPct === undefined ||
      (typeof action.decisionAccuracyPct === "number" &&
        action.decisionAccuracyPct >= 0 &&
        action.decisionAccuracyPct <= 100)) &&
    (action.learningStatus === undefined ||
      action.learningStatus === "Ready" ||
      action.learningStatus === "Learning" ||
      action.learningStatus === "Learned") &&
    isOptional(action.learningNote, "string") &&
    (action.feedback === undefined || action.feedback === "Good" || action.feedback === "Bad") &&
    isOptional(action.feedbackAt, "string") &&
    (action.history === undefined ||
      (Array.isArray(action.history) &&
        action.history.every(
          (event) =>
            !!event &&
            typeof event === "object" &&
            typeof event.at === "string" &&
            typeof event.actor === "string" &&
            typeof event.event === "string" &&
            typeof event.details === "string",
        ))) &&
    isOptional(action.executionStartedAt, "string") &&
    (action.executionTimeMs === undefined ||
      (typeof action.executionTimeMs === "number" && action.executionTimeMs >= 0)) &&
    isOptional(action.failureReason, "string") &&
    (action.progress === undefined ||
      (typeof action.progress === "number" && action.progress >= 0 && action.progress <= 100)) &&
    isOptional(action.confidence, "number") &&
    isOptional(action.explanation, "string")
  );
}

export function restoreActions(actions: Action[]) {
  return actions.map((action) => {
    const resource = resources.find((item) => item.name === action.target);
    const enriched = withResourceImpact(action, resource);
    if (action.status === "Executing" || action.status === "Verifying") {
      return {
        ...enriched,
        status: "Failed",
        progress: undefined,
        failureReason: "Execution was interrupted before verification. No savings were applied.",
        outcome: "Unsuccessful" as const,
        costSavingInr: 0,
        carbonSavingKg: 0,
        energySavingKwh: 0,
        slaResult: "Not verified · execution was interrupted",
        decisionAccuracyPct: 0,
        learningStatus: "Ready" as const,
      };
    }
    if (action.learningStatus === "Learning") {
      // A reload interrupted learning; the rating is already recorded, so finish it.
      return {
        ...enriched,
        learningStatus: "Learned" as const,
        learningNote: getLearningNote(enriched),
      };
    }
    if ((action.status === verifiedStatus || action.status === "Failed") && !action.outcome) {
      const succeeded = action.status === verifiedStatus;
      return {
        ...enriched,
        outcome: succeeded ? ("Successful" as const) : ("Unsuccessful" as const),
        costSavingInr: succeeded
          ? (action.costSavingInr ?? enriched.expectedCostSavingInr ?? 0)
          : 0,
        carbonSavingKg: succeeded
          ? (action.carbonSavingKg ?? enriched.expectedCarbonSavingKg ?? 0)
          : 0,
        energySavingKwh: succeeded
          ? (action.energySavingKwh ?? enriched.expectedEnergySavingKwh ?? 0)
          : 0,
        slaResult: succeeded ? "Maintained · verified" : "Not met · verification failed",
        decisionAccuracyPct: succeeded ? 100 : 0,
        learningStatus: "Ready" as const,
      };
    }
    return enriched;
  });
}

export function createExecutionResult(action: Action, shouldFail: boolean): Action {
  const expectedCost = action.expectedCostSavingInr ?? 0;
  const expectedCarbon = action.expectedCarbonSavingKg ?? 0;
  const expectedEnergy = action.expectedEnergySavingKwh ?? 0;
  const costRate = shouldFail ? 0 : action.risk === "Low" ? 0.94 : 0.7;
  const carbonRate = shouldFail ? 0 : action.risk === "Low" ? 0.9 : 0.72;
  const actualCostSavingInr = Math.round(expectedCost * costRate);
  const actualCarbonSavingKg = Math.round(expectedCarbon * carbonRate);
  const actualEnergySavingKwh = Math.round(
    expectedEnergy * (shouldFail ? 0 : (costRate + carbonRate) / 2),
  );
  const accuracy =
    expectedCost === 0 || expectedCarbon === 0
      ? 0
      : Math.round(
          ((actualCostSavingInr / expectedCost + actualCarbonSavingKg / expectedCarbon) / 2) * 100,
        );
  const outcome = shouldFail
    ? "Unsuccessful"
    : costRate >= 0.8 && carbonRate >= 0.8
      ? "Successful"
      : "Partially successful";

  return {
    ...action,
    status: shouldFail ? "Failed" : verifiedStatus,
    progress: shouldFail ? undefined : 100,
    failureReason: shouldFail
      ? "Post-change verification did not pass. No dashboard savings were applied."
      : undefined,
    outcome,
    costSavingInr: actualCostSavingInr,
    carbonSavingKg: actualCarbonSavingKg,
    energySavingKwh: actualEnergySavingKwh,
    slaResult: shouldFail
      ? "Not met · verification failed; no change was applied"
      : action.risk === "Low"
        ? "Maintained · latency within 2% of baseline"
        : "Maintained · latency within 6% of baseline",
    decisionAccuracyPct: accuracy,
    learningStatus: "Ready",
    learningNote: undefined,
    feedback: undefined,
    feedbackAt: undefined,
  };
}

export function getLearningNote(action: Action) {
  if (action.feedback === "Good") {
    return action.outcome === "Successful"
      ? "You confirmed this change was good. CurbBrain will prioritize similar recommendations and keep its confidence for this pattern."
      : "You rated this change good even though the result fell short of its estimate. CurbBrain will keep recommending it and tune its impact estimate for similar workloads.";
  }
  if (action.feedback === "Bad") {
    return action.outcome === "Successful"
      ? "You rated this change bad even though it met its targets. CurbBrain will ask for review before similar changes and look for side effects the metrics did not capture."
      : "You confirmed this change was bad. CurbBrain will lower confidence in similar recommendations and add stronger validation checks.";
  }
  if (action.outcome === "Successful") {
    return "The result matched the recommendation. CurbBrain will prioritize similar signals and confidence patterns in future recommendations.";
  }
  if (action.outcome === "Partially successful") {
    return "The result delivered partial savings. CurbBrain will tune its impact estimate and risk weighting for similar workloads.";
  }
  return "The verification failed. CurbBrain will lower confidence in similar recommendations and surface stronger validation checks.";
}

export type AuditCheck = { label: string; detail: string; passed: boolean };
export type AuditVerdict = {
  verdict: "Good change" | "Mixed result" | "Bad change";
  tone: "success" | "partial" | "failure";
  summary: string;
  checks: AuditCheck[];
};

function shareOfExpected(actual: number | undefined, expected: number | undefined) {
  return expected ? Math.round(((actual ?? 0) / expected) * 100) : 0;
}

// Post-change audit: compares what the change delivered with what was promised.
export function getAuditVerdict(action: Action): AuditVerdict | null {
  if (!action.outcome) return null;
  const costShare = shareOfExpected(action.costSavingInr, action.expectedCostSavingInr);
  const carbonShare = shareOfExpected(action.carbonSavingKg, action.expectedCarbonSavingKg);
  const slaMaintained = action.slaResult?.startsWith("Maintained") ?? false;
  const checks: AuditCheck[] = [
    {
      label: "Cost saving",
      detail: `${formatInr(action.costSavingInr ?? 0)} of ${formatInr(action.expectedCostSavingInr ?? 0)} expected (${costShare}%)`,
      passed: costShare >= 80,
    },
    {
      label: "CO₂e reduction",
      detail: `${formatNumber(action.carbonSavingKg ?? 0)} of ${formatNumber(action.expectedCarbonSavingKg ?? 0)} kg expected (${carbonShare}%)`,
      passed: carbonShare >= 80,
    },
    {
      label: "Performance (SLA)",
      detail: action.slaResult ?? "Not evaluated",
      passed: slaMaintained,
    },
  ];
  if (action.outcome === "Successful" && slaMaintained) {
    return {
      verdict: "Good change",
      tone: "success",
      summary: "Savings met the estimate and performance stayed within limits.",
      checks,
    };
  }
  if (action.outcome === "Partially successful") {
    return {
      verdict: "Mixed result",
      tone: "partial",
      summary: "Performance held, but savings fell short of the estimate.",
      checks,
    };
  }
  return {
    verdict: "Bad change",
    tone: "failure",
    summary: "The change did not deliver its savings. Nothing was counted on the dashboard.",
    checks,
  };
}

export function getFeedbackSummary(actions: Action[]) {
  const audited = actions.filter((action) => action.outcome);
  return {
    good: audited.filter((action) => action.feedback === "Good").length,
    bad: audited.filter((action) => action.feedback === "Bad").length,
    awaiting: audited.filter((action) => !action.feedback).length,
  };
}

export function recordChangeFeedback(
  action: Action,
  feedback: ChangeFeedback,
  at = new Date().toISOString(),
): Action {
  const verdict = getAuditVerdict(action);
  return appendActionHistory(
    { ...action, feedback, feedbackAt: at, learningStatus: "Learning", learningNote: undefined },
    {
      at,
      actor: "User",
      event: `Change audited · rated ${feedback === "Good" ? "good" : "bad"}`,
      details: verdict
        ? `Audit verdict: ${verdict.verdict}. ${verdict.summary}`
        : "User rated the change.",
    },
  );
}

export function getDecisionAccuracy(actions: Action[]) {
  const evaluated = actions.filter((action) => action.decisionAccuracyPct !== undefined);
  if (evaluated.length === 0) return null;
  return Math.round(
    evaluated.reduce((total, action) => total + action.decisionAccuracyPct!, 0) / evaluated.length,
  );
}

function readBrowserState(): PilotState {
  const serialized = window.localStorage.getItem(STORAGE_KEY);
  if (serialized === currentSerialized) return currentState;
  currentSerialized = serialized;
  if (serialized === null) {
    currentState = serverState;
    return currentState;
  }
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (
      parsed &&
      typeof parsed === "object" &&
      "actions" in parsed &&
      Array.isArray(parsed.actions) &&
      parsed.actions.every(isAction)
    ) {
      currentState = { actions: restoreActions(parsed.actions) };
    } else {
      throw new Error("Stored CurbPilot state has an invalid shape.");
    }
  } catch (error) {
    console.error("Unable to restore CurbPilot state.", error);
    currentState = serverState;
  }
  return currentState;
}

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function usePilotState() {
  return useSyncExternalStore(subscribe, readBrowserState, () => serverState);
}

export function updatePilotState(update: (state: PilotState) => PilotState) {
  const nextState = update(readBrowserState());
  const serialized = JSON.stringify(nextState);
  window.localStorage.setItem(STORAGE_KEY, serialized);
  currentState = nextState;
  currentSerialized = serialized;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function transitionAction(
  previous: Action,
  next: Action,
  at = new Date().toISOString(),
): Action {
  if (previous.status === next.status) return next;
  let actor = "CurbPilot";
  let event = next.status;
  let details = `Action status changed from ${previous.status} to ${next.status}.`;
  let executionStartedAt = next.executionStartedAt;
  let executionTimeMs = next.executionTimeMs;

  if (next.status === "Executing") {
    const retry = previous.status === "Failed";
    actor = retry
      ? "CurbPilot retry"
      : previous.risk === "Low"
        ? "CurbPilot auto-execute"
        : "User approval";
    event = retry
      ? "Change retry started"
      : previous.risk === "Low"
        ? "Auto-execution started"
        : "Change approved and execution started";
    details = retry
      ? "User confirmed a retry of the action."
      : previous.risk === "Low"
        ? "Queued low-risk change started under auto-execute policy."
        : "User reviewed and approved the medium-risk recommendation.";
    executionStartedAt = at;
    executionTimeMs = undefined;
  } else if (next.status === "Rejected") {
    actor = "User";
    event = "Recommendation rejected";
    details = "User rejected the proposed change; no execution was performed.";
  } else if (next.status === "Verifying") {
    actor = "CurbPilot";
    event = "Execution completed";
    details = "The change finished and its result is being verified.";
    executionTimeMs = executionStartedAt
      ? Math.max(0, new Date(at).getTime() - new Date(executionStartedAt).getTime())
      : undefined;
  } else if (next.status === verifiedStatus) {
    actor = "CurbPilot verification";
    event = `Result verified · ${next.outcome ?? "Successful"}`;
    details = `Expected savings were compared with actual results. ${next.slaResult ?? ""}`.trim();
  } else if (next.status === "Failed") {
    actor = "CurbPilot verification";
    event = "Verification failed";
    details = next.failureReason ?? "Verification did not pass.";
  }

  const historyEvent: ActionHistoryEvent = { at, actor, event, details };
  return {
    ...next,
    executionStartedAt,
    executionTimeMs,
    history: [...(previous.history ?? []), historyEvent],
  };
}

export function appendActionHistory(action: Action, historyEvent: ActionHistoryEvent): Action {
  return { ...action, history: [...(action.history ?? []), historyEvent] };
}

export function getVerifiedImpact(actions: Action[]) {
  const verifiedTargets = new Set<string>();
  return actions.reduce(
    (impact, action) => {
      if (action.status !== verifiedStatus || verifiedTargets.has(action.target)) {
        return impact;
      }
      verifiedTargets.add(action.target);
      return {
        actionCount: impact.actionCount + 1,
        costSavingInr: impact.costSavingInr + (action.costSavingInr ?? 0),
        carbonSavingKg: impact.carbonSavingKg + (action.carbonSavingKg ?? 0),
        energySavingKwh: impact.energySavingKwh + (action.energySavingKwh ?? 0),
      };
    },
    { actionCount: 0, costSavingInr: 0, carbonSavingKg: 0, energySavingKwh: 0 },
  );
}

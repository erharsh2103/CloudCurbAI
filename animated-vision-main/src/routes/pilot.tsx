import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Check,
  CircleAlert,
  Gauge,
  LoaderCircle,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import { Page } from "@/components/ui-kit";
import { isCurbPilotEligible, resources, type ChangeFeedback } from "@/lib/data";
import {
  createOpportunityAction,
  createExecutionResult,
  appendActionHistory,
  getAuditVerdict,
  getDecisionAccuracy,
  getFeedbackSummary,
  getLearningNote,
  recordChangeFeedback,
  updatePilotState,
  transitionAction,
  usePilotState,
  type PilotState,
} from "@/lib/pilot-state";

export const Route = createFileRoute("/pilot")({
  validateSearch: (search: Record<string, unknown>): { opportunity?: string } => ({
    ...(typeof search["opportunity"] === "string" ? { opportunity: search["opportunity"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "CurbPilot Autonomous Actions — CloudCurb AI" },
      {
        name: "description",
        content: "Risk-tiered cloud changes with approvals, verification and post-change audits.",
      },
      { property: "og:title", content: "CurbPilot Autonomous Actions — CloudCurb AI" },
      {
        property: "og:description",
        content: "Review, execute, verify and audit cloud optimization actions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Pilot,
});

type Request = { type: "approve" | "reject" | "retry"; id: string };

function updateAction(
  id: string,
  update: (action: PilotState["actions"][number]) => PilotState["actions"][number],
) {
  updatePilotState((state) => ({
    actions: state.actions.map((action) => {
      if (action.id !== id) return action;
      const next = update(action);
      return transitionAction(action, next);
    }),
  }));
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function Pilot() {
  const { opportunity } = Route.useSearch();
  const { actions } = usePilotState();
  const decisionAccuracy = getDecisionAccuracy(actions);
  const [handoffMessage, setHandoffMessage] = useState("");
  const [request, setRequest] = useState<Request | null>(null);
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!opportunity) return;
    const item = resources.find((resource) => resource.id === opportunity);
    if (!item) {
      setHandoffMessage("That opportunity could not be found.");
      return;
    }
    if (!isCurbPilotEligible(item)) {
      setHandoffMessage(
        "High-risk recommendations require manual review and cannot be queued in CurbPilot.",
      );
      return;
    }
    updatePilotState((state) => {
      const action = createOpportunityAction(item);
      if (
        state.actions.some((existing) => existing.id === action.id || existing.target === item.name)
      ) {
        return state;
      }
      return { actions: [action, ...state.actions] };
    });
    setHandoffMessage(
      `${item.name} was received by CurbPilot. Existing workflow status is retained if already present.`,
    );
  }, [opportunity]);

  const openRequest = (nextRequest: Request) => {
    setSimulateFailure(false);
    setRequest(nextRequest);
  };

  const execute = async (ids: string[], shouldFail: boolean) => {
    setBusy(true);
    try {
      for (const id of ids) {
        updateAction(id, (action) =>
          action.risk === "Low" || action.risk === "Medium"
            ? { ...action, status: "Executing", progress: 0, failureReason: undefined }
            : action,
        );
        for (const progress of [20, 45, 70, 90, 100]) {
          await wait(220);
          updateAction(id, (action) =>
            action.status === "Executing" ? { ...action, progress } : action,
          );
        }
        updateAction(id, (action) =>
          action.status === "Executing" ? { ...action, status: "Verifying" } : action,
        );
        await wait(500);
        updateAction(id, (action) =>
          action.status === "Verifying" ? createExecutionResult(action, shouldFail) : action,
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const rateChange = async (id: string, feedback: ChangeFeedback) => {
    updateAction(id, (action) =>
      action.outcome && action.learningStatus !== "Learning"
        ? recordChangeFeedback(action, feedback)
        : action,
    );
    await wait(900);
    updateAction(id, (action) =>
      action.outcome && action.learningStatus === "Learning"
        ? appendActionHistory(
            { ...action, learningStatus: "Learned", learningNote: getLearningNote(action) },
            {
              at: new Date().toISOString(),
              actor: "CurbBrain",
              event: "Learning feedback recorded",
              details: getLearningNote(action),
            },
          )
        : action,
    );
  };

  const confirmRequest = async () => {
    if (!request) return;
    const pending = request;
    setRequest(null);
    if (pending.type === "reject") {
      updateAction(pending.id, (action) =>
        action.status === "Queued" || action.status === "Awaiting approval"
          ? { ...action, status: "Rejected", progress: undefined }
          : action,
      );
      return;
    }
    const selected = actions.find((action) => action.id === pending.id);
    if (!selected || selected.risk === "High") return;
    if (
      pending.type === "approve" &&
      selected.status !== "Queued" &&
      selected.status !== "Awaiting approval"
    )
      return;
    if (pending.type === "retry" && selected.status !== "Failed") return;
    await execute([selected.id], simulateFailure);
  };

  const requestedAction = request ? actions.find((action) => action.id === request.id) : undefined;
  const requestStatuses = ["Queued", "Awaiting approval", "Blocked"];
  const feedbackSummary = getFeedbackSummary(actions);
  const actionGroups = [
    {
      id: "requests",
      title: "AI change requests",
      description: "Review the changes CurbBrain is asking to make before they run.",
      icon: Sparkles,
      actions: actions.filter((action) => requestStatuses.includes(action.status)),
    },
    {
      id: "results",
      title: "Approved changes & results",
      description:
        "Each completed change is audited against its estimate. Rate it good or bad so CurbBrain learns.",
      icon: Check,
      actions: actions.filter((action) => !requestStatuses.includes(action.status)),
    },
  ] as const;

  return (
    <Page title="CurbPilot">
      {handoffMessage && (
        <div
          role="status"
          className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary"
        >
          {handoffMessage}
        </div>
      )}
      <div className="pilot-columns">
        {actionGroups.map((group) => (
          <section
            key={group.id}
            className="pilot-column"
            aria-labelledby={`pilot-${group.id}-heading`}
          >
            <header className="pilot-column-heading">
              <span className="pilot-column-icon">
                <group.icon size={17} />
              </span>
              <div>
                <h2 id={`pilot-${group.id}-heading`}>{group.title}</h2>
                <p>{group.description}</p>
              </div>
              <span className="pilot-column-count">{group.actions.length}</span>
            </header>
            {group.id === "results" && (
              <div className="pilot-feedback-summary" aria-label="AI feedback and learning summary">
                <div>
                  <strong>Change audit</strong>
                  <p>
                    <span className="text-primary">{feedbackSummary.good} good</span> ·{" "}
                    <span className="text-danger">{feedbackSummary.bad} bad</span> ·{" "}
                    {feedbackSummary.awaiting} awaiting your rating
                  </p>
                </div>
                <div className="pilot-feedback-accuracy">
                  <span>AI decision accuracy</span>
                  <strong>{decisionAccuracy === null ? "—" : `${decisionAccuracy}%`}</strong>
                  <small>
                    {decisionAccuracy === null
                      ? "No evaluated results yet"
                      : `${actions.filter((action) => action.outcome).length} evaluated action${actions.filter((action) => action.outcome).length === 1 ? "" : "s"}`}
                  </small>
                </div>
              </div>
            )}
            <div className="pilot-column-list">
              {group.actions.length === 0 && (
                <p className="pilot-workflow-empty">
                  {group.id === "requests"
                    ? "No AI change requests are waiting for review."
                    : "Approve a change on the left. Its result and audit will appear here."}
                </p>
              )}
              {group.actions.map((action, index) => {
                const audit = getAuditVerdict(action);
                return (
                  <article
                    key={action.id}
                    className="pilot-action-card"
                    style={{ animationDelay: `${index * 70}ms` }}
                  >
                    <div className="pilot-action-heading">
                      <div>
                        <div className="pilot-action-title">{action.title}</div>
                        <span className="pilot-action-risk">{action.risk} risk</span>
                      </div>
                      <span
                        className={`pilot-action-status pilot-status-${action.status.startsWith("Verified") ? "verified" : action.status === "Failed" || action.status === "Rejected" ? "failed" : action.status === "Blocked" ? "blocked" : action.status === "Executing" || action.status === "Verifying" ? "running" : "pending"}`}
                      >
                        {action.status}
                      </span>
                    </div>
                    <div className="pilot-action-target">{action.target}</div>
                    <div className="pilot-action-saving">{action.saving}</div>
                    {action.explanation && (
                      <div className="pilot-ai-recommendation">
                        <strong>AI recommendation · {action.confidence}% confidence</strong>
                        <p>{action.explanation}</p>
                      </div>
                    )}
                    {action.status === "Executing" && (
                      <div
                        className="pilot-execution-progress"
                        aria-label={`Execution progress ${action.progress ?? 0}%`}
                      >
                        <div>
                          <span>Executing change</span>
                          <strong>{action.progress ?? 0}%</strong>
                        </div>
                        <div className="pilot-progress-track">
                          <span style={{ width: `${action.progress ?? 0}%` }} />
                        </div>
                      </div>
                    )}
                    {action.status === "Verifying" && (
                      <div className="pilot-verifying">
                        <LoaderCircle size={14} className="animate-spin" /> Verifying result…
                      </div>
                    )}
                    {action.status.startsWith("Verified") && (
                      <div className="pilot-result-message pilot-result-success">
                        <Check size={14} /> Change completed and impact verified. Dashboard totals
                        updated.
                      </div>
                    )}
                    {action.status === "Failed" && (
                      <div className="pilot-result-message pilot-result-failure">
                        <CircleAlert size={14} /> {action.failureReason}
                      </div>
                    )}
                    {audit && (
                      <section
                        className={`pilot-outcome-panel pilot-outcome-${audit.tone}`}
                        aria-label={`Post-change audit: ${audit.verdict}`}
                      >
                        <div className="pilot-outcome-heading">
                          <span>Post-change audit</span>
                          <strong>{audit.verdict}</strong>
                        </div>
                        <p className="pilot-audit-summary">{audit.summary}</p>
                        <ul className="pilot-audit-checks">
                          {audit.checks.map((check) => (
                            <li
                              key={check.label}
                              className={check.passed ? "is-passed" : "is-failed"}
                            >
                              {check.passed ? <Check size={14} /> : <X size={14} />}
                              <span>
                                <strong>{check.label}</strong>
                                {check.detail}
                              </span>
                            </li>
                          ))}
                          <li className="is-info">
                            <Gauge size={14} />
                            <span>
                              <strong>AI decision accuracy</strong>
                              {action.decisionAccuracyPct ?? 0}% of the estimate delivered
                            </span>
                          </li>
                        </ul>
                        {action.feedback ? (
                          <div
                            className={`pilot-learned-state pilot-feedback-${action.feedback === "Good" ? "good" : "bad"}`}
                            role="status"
                          >
                            {action.feedback === "Good" ? (
                              <ThumbsUp size={15} />
                            ) : (
                              <ThumbsDown size={15} />
                            )}
                            <div>
                              <strong>
                                You rated this change {action.feedback === "Good" ? "good" : "bad"}
                                {action.learningStatus === "Learning" &&
                                  " · CurbBrain is learning…"}
                              </strong>
                              {action.learningNote && <p>{action.learningNote}</p>}
                            </div>
                          </div>
                        ) : (
                          <div className="pilot-feedback-ask">
                            <span>Was this change good or bad?</span>
                            <div>
                              <Button
                                size="sm"
                                className="pilot-feedback-good"
                                onClick={() => void rateChange(action.id, "Good")}
                              >
                                <ThumbsUp /> Good change
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="pilot-feedback-bad"
                                onClick={() => void rateChange(action.id, "Bad")}
                              >
                                <ThumbsDown /> Bad change
                              </Button>
                            </div>
                          </div>
                        )}
                      </section>
                    )}
                    {(action.status === "Queued" || action.status === "Awaiting approval") && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => openRequest({ type: "approve", id: action.id })}
                          disabled={busy}
                        >
                          {action.status === "Queued" ? "Approve & run" : "Review & approve"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openRequest({ type: "reject", id: action.id })}
                          disabled={busy}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                    {action.status === "Failed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3"
                        onClick={() => openRequest({ type: "retry", id: action.id })}
                        disabled={busy}
                      >
                        Retry change
                      </Button>
                    )}
                    {action.status === "Blocked" && (
                      <div className="mt-2 text-sm text-danger">
                        Policy: high-risk or SLA-critical workload — manual change ticket required.
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <Dialog open={request !== null} onOpenChange={(open) => !open && setRequest(null)}>
        <DialogContent className="pilot-confirmation-dialog">
          <DialogHeader>
            <DialogTitle>
              {request?.type === "reject"
                ? "Confirm rejection"
                : request?.type === "retry"
                  ? "Retry change?"
                  : "Approve and run change?"}
            </DialogTitle>
            <DialogDescription>
              {request?.type === "reject"
                ? `Reject the recommendation for ${requestedAction?.target ?? "this resource"}? The change will not run.`
                : `Review the recommendation for ${requestedAction?.target ?? "this resource"}. CurbPilot will run the approved action and audit its result.`}
            </DialogDescription>
          </DialogHeader>
          {requestedAction && (
            <div className="pilot-confirmation-impact">
              <strong>{requestedAction.title}</strong>
              <span>{requestedAction.saving}</span>
              {requestedAction.explanation && <p>{requestedAction.explanation}</p>}
            </div>
          )}
          {request?.type !== "reject" && (
            <label className="pilot-failure-simulation">
              <input
                type="checkbox"
                checked={simulateFailure}
                onChange={(event) => setSimulateFailure(event.target.checked)}
              />
              <span>
                Simulate verification failure
                <small>Demo only: test failure handling without applying any savings.</small>
              </span>
            </label>
          )}
          <div className="pilot-confirmation-actions">
            <Button variant="outline" onClick={() => setRequest(null)} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant={request?.type === "reject" ? "destructive" : "default"}
              onClick={() => void confirmRequest()}
              disabled={busy}
            >
              {request?.type === "reject"
                ? "Confirm rejection"
                : request?.type === "retry"
                  ? "Confirm retry"
                  : "Approve & run"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Page>
  );
}

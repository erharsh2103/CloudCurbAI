import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, Clock3, FileClock, ShieldCheck, ThumbsDown, ThumbsUp } from "lucide-react";
import { Page, Card, Risk, Stat } from "@/components/ui-kit";
import { audit } from "@/lib/data";
import { formatInr, formatInrCompact, formatNumber } from "@/lib/format";
import { impactSummary, resourceHoursFromKwh, treesEquivalent } from "@/lib/raw-cloud";
import {
  getAuditVerdict,
  getFeedbackSummary,
  getVerifiedImpact,
  usePilotState,
} from "@/lib/pilot-state";

export const Route = createFileRoute("/impact")({
  head: () => ({
    meta: [
      { title: "Impact & Audit — CloudCurb AI" },
      {
        name: "description",
        content: "CO₂, energy and cost impact with a complete AI decision audit trail.",
      },
      { property: "og:title", content: "Impact & Audit — CloudCurb AI" },
      {
        property: "og:description",
        content: "Explore AI detections, approvals, execution, verified impact and change ratings.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Impact,
});

const tagCls: Record<string, string> = {
  Executed: "text-primary bg-primary/10",
  Approved: "text-info bg-info/10",
  Blocked: "text-danger bg-danger/10",
  Rejected: "text-warn bg-warn/10",
};

function formatTimestamp(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function Impact() {
  const { actions } = usePilotState();
  const verifiedImpact = getVerifiedImpact(actions);
  const completedActions = actions.filter((action) => action.outcome);
  const successfulActions = completedActions.filter((action) =>
    action.slaResult?.startsWith("Maintained"),
  ).length;
  const slaCount = impactSummary.actionsExecuted + completedActions.length;
  const slaPercent =
    slaCount === 0
      ? impactSummary.slaMaintainedPercent
      : (impactSummary.slaMaintainedPercent * impactSummary.actionsExecuted + successfulActions) /
        slaCount;
  const resourceHoursSaved = Math.round(resourceHoursFromKwh(verifiedImpact.energySavingKwh));
  const feedbackSummary = getFeedbackSummary(actions);
  const carbonAvoided = impactSummary.carbonAvoidedTonnes + verifiedImpact.carbonSavingKg / 1000;
  const auditActions = actions
    .filter((action) => (action.history?.length ?? 0) > 0)
    .slice()
    .sort((left, right) => {
      const leftAt = left.history?.at(-1)?.at ?? "";
      const rightAt = right.history?.at(-1)?.at ?? "";
      return rightAt.localeCompare(leftAt);
    });

  return (
    <Page title="Impact & Audit">
      <div className="impact-audit-source-note">
        Figures cover the {impactSummary.periodLabel.toLowerCase()}. Verified CurbPilot outcomes
        from this browser&apos;s saved workflow are added on top.
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat
          label="CO₂ avoided"
          value={`${carbonAvoided.toFixed(1)} t`}
          delta={`≈ ${formatNumber(treesEquivalent(carbonAvoided))} trees for a year`}
        />
        <Stat
          label="Energy saved"
          value={`${(impactSummary.energySavedMwh + verifiedImpact.energySavingKwh / 1000).toFixed(1)} MWh`}
          delta="Historical + verified actions"
        />
        <Stat
          label="Cost saved"
          value={formatInrCompact(impactSummary.costSavedInr + verifiedImpact.costSavingInr)}
          delta="Historical + verified actions"
        />
        <Stat
          label="Resource-hours saved"
          value={`${((impactSummary.resourceHoursSaved + resourceHoursSaved) / 1_000_000).toFixed(2)}M`}
          delta="At the fleet's average power draw"
        />
        <Stat
          label="Actions executed"
          value={formatNumber(impactSummary.actionsExecuted + verifiedImpact.actionCount)}
          delta={`${verifiedImpact.actionCount} verified in CurbPilot`}
        />
        <Stat
          label="SLA maintained"
          value={`${slaPercent.toFixed(2)}%`}
          delta="Historical + completed outcomes"
        />
      </div>
      <Card title="AI decision audit trail" className="impact-decision-card">
        <div className="impact-audit-intro">
          <div>
            <strong>Detection → recommendation → decision → verified impact</strong>
            <p>
              Open any CurbPilot record to inspect the full decision history, including approval,
              execution timing, expected-versus-actual results and your good/bad rating.
            </p>
          </div>
          <span className="impact-feedback-totals" aria-label="Change ratings">
            <span className="impact-outcome-tag impact-outcome-success">
              <ThumbsUp size={12} /> {feedbackSummary.good} good
            </span>
            <span className="impact-outcome-tag impact-outcome-failure">
              <ThumbsDown size={12} /> {feedbackSummary.bad} bad
            </span>
            <span className="impact-outcome-tag">{feedbackSummary.awaiting} to rate</span>
          </span>
        </div>
        {auditActions.length > 0 ? (
          <ol className="impact-decision-list">
            {auditActions.map((action) => {
              const latestEvent = action.history?.at(-1);
              const completed = Boolean(action.outcome);
              return (
                <li key={action.id}>
                  <Dialog>
                    <DialogTrigger asChild>
                      <button className="impact-audit-entry" type="button">
                        <span className="impact-audit-entry-icon">
                          {completed ? <ShieldCheck size={16} /> : <FileClock size={16} />}
                        </span>
                        <span className="impact-audit-entry-copy">
                          <strong>{action.target}</strong>
                          <span>{action.title}</span>
                          <small>
                            {latestEvent?.event ?? action.status}
                            {latestEvent ? ` · ${formatTimestamp(latestEvent.at)}` : ""}
                          </small>
                        </span>
                        <span className="impact-audit-entry-meta">
                          <Risk r={action.risk} />
                          {action.feedback && (
                            <span
                              className={`impact-outcome-tag impact-outcome-${action.feedback === "Good" ? "success" : "failure"}`}
                            >
                              {action.feedback === "Good" ? (
                                <ThumbsUp size={12} />
                              ) : (
                                <ThumbsDown size={12} />
                              )}{" "}
                              Rated {action.feedback === "Good" ? "good" : "bad"}
                            </span>
                          )}
                          <span
                            className={`impact-outcome-tag impact-outcome-${action.outcome === "Successful" ? "success" : action.outcome === "Partially successful" ? "partial" : action.outcome === "Unsuccessful" ? "failure" : "pending"}`}
                          >
                            {action.outcome ?? action.status}
                          </span>
                        </span>
                        <ArrowUpRight size={15} className="impact-audit-open-icon" />
                      </button>
                    </DialogTrigger>
                    <DialogContent className="impact-history-dialog">
                      <DialogHeader>
                        <span className="impact-history-eyebrow">
                          <FileClock size={14} /> FULL DECISION HISTORY
                        </span>
                        <DialogTitle>{action.target}</DialogTitle>
                        <DialogDescription>
                          {action.title} · {action.risk} risk · {action.confidence ?? "—"}% AI
                          confidence
                        </DialogDescription>
                      </DialogHeader>
                      <div className="impact-history-summary">
                        <section>
                          <h3>What AI detected</h3>
                          <p>
                            {action.explanation ??
                              "Detection details were not recorded for this legacy action."}
                          </p>
                        </section>
                        <section>
                          <h3>AI recommendation</h3>
                          <p>{action.title}</p>
                        </section>
                        <div className="impact-history-summary-meta">
                          <span>
                            Risk assessment <Risk r={action.risk} />
                          </span>
                          <span>
                            Final decision <strong>{action.outcome ?? action.status}</strong>
                          </span>
                          <span>
                            Audit verdict{" "}
                            <strong>{getAuditVerdict(action)?.verdict ?? "Not audited yet"}</strong>
                          </span>
                          <span>
                            Your rating{" "}
                            <strong>
                              {action.feedback
                                ? `${action.feedback} change`
                                : action.outcome
                                  ? "Not rated yet"
                                  : "—"}
                            </strong>
                          </span>
                          <span>
                            Execution time{" "}
                            <strong>
                              {action.executionTimeMs === undefined
                                ? "Not executed"
                                : `${(action.executionTimeMs / 1000).toFixed(1)} seconds`}
                            </strong>
                          </span>
                        </div>
                      </div>
                      <section className="impact-history-impact">
                        <h3>
                          Expected impact vs actual impact <small>monthly estimates</small>
                        </h3>
                        <div className="impact-history-impact-grid">
                          <div>
                            <span>Expected CO₂ reduction</span>
                            <strong>{formatNumber(action.expectedCarbonSavingKg ?? 0)} kg</strong>
                          </div>
                          <div>
                            <span>Actual CO₂ reduction</span>
                            <strong>{formatNumber(action.carbonSavingKg ?? 0)} kg</strong>
                          </div>
                          <div>
                            <span>Expected cost saving</span>
                            <strong>{formatInr(action.expectedCostSavingInr ?? 0)}</strong>
                          </div>
                          <div>
                            <span>Actual cost saving</span>
                            <strong>{formatInr(action.costSavingInr ?? 0)}</strong>
                          </div>
                          <div>
                            <span>Expected energy saved</span>
                            <strong>{formatNumber(action.expectedEnergySavingKwh ?? 0)} kWh</strong>
                          </div>
                          <div>
                            <span>Actual energy saved</span>
                            <strong>{formatNumber(action.energySavingKwh ?? 0)} kWh</strong>
                          </div>
                          <div>
                            <span>SLA / performance</span>
                            <strong>{action.slaResult ?? "Not verified"}</strong>
                          </div>
                          <div>
                            <span>AI decision accuracy</span>
                            <strong>
                              {action.decisionAccuracyPct === undefined
                                ? "Not evaluated"
                                : `${action.decisionAccuracyPct}%`}
                            </strong>
                          </div>
                        </div>
                      </section>
                      <section className="impact-history-timeline">
                        <h3>Decision history</h3>
                        <ol>
                          {(action.history ?? []).map((event, index) => (
                            <li key={`${event.at}-${index}`}>
                              <span className="impact-history-timeline-marker" />
                              <div>
                                <strong>{event.event}</strong>
                                <p>{event.details}</p>
                                <small>
                                  {event.actor} · {formatTimestamp(event.at)}
                                </small>
                              </div>
                            </li>
                          ))}
                        </ol>
                      </section>
                    </DialogContent>
                  </Dialog>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="impact-audit-empty">
            CurbPilot decision records will appear here as actions enter the workflow.
          </p>
        )}
        <div className="impact-execution-footnote">
          <Clock3 size={13} />
          Resource-hours are estimated from energy saved at the fleet&apos;s average power draw.
        </div>
      </Card>
      <Card title="Audit log">
        <ol className="relative ml-2 border-l">
          {audit.map((entry, index) => (
            <li key={index} className="mb-5 ml-5">
              <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-background bg-primary" />
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">{entry.t}</span>·<span>{entry.who}</span>
                <span className={`rounded px-1.5 py-0.5 font-semibold ${tagCls[entry.tag]}`}>
                  {entry.tag}
                </span>
              </div>
              <div className="mt-1 text-sm">{entry.msg}</div>
            </li>
          ))}
        </ol>
      </Card>
    </Page>
  );
}

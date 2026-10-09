import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Brain,
  Check,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  Layers3,
  Leaf,
  Pause,
  Play,
  RotateCcw,
  Server,
  TriangleAlert,
  ShieldCheck,
  Sparkles,
  Clock3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { audit, monthly, resources as opportunities, type Res } from "@/lib/data";
import { formatInrCompact, formatNumber } from "@/lib/format";
import { TrendChart } from "@/components/trend-chart";
import { SceneView } from "@/components/scene-view";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  calculateMonthlyCarbonTrend,
  impactSummary,
  rawMetrics,
  decisionSteps,
  calculateOptimizationProjection,
  resourceComposition,
  resourceCounts,
  resourceIntelligence,
  allResources as fleetResources,
  fleetEnergyMwh,
} from "@/lib/raw-cloud";
import { getVerifiedImpact, usePilotState } from "@/lib/pilot-state";

const SCENE_PAGE_SIZE = 10;
const TREND_WINDOW_SIZE = 6;
const sceneResources: Res[] = fleetResources.map((resource, index) => {
  const status = resource.status.toLowerCase();
  const protectedProduction = resource.environment === "PROD" || resource.status === "PROTECTED";
  const region = ["us-east-1", "eu-west-1", "ap-south-1", "us-west-2"][index % 4]!;
  const action = protectedProduction
    ? "No automated action — production protected"
    : resource.status === "IDLE"
      ? "Schedule or stop during idle hours"
      : resource.status === "OVERSIZED"
        ? "Review rightsizing recommendation"
        : resource.status === "ORPHANED"
          ? "Verify ownership before cleanup"
          : "Monitor utilization and carbon impact";

  return {
    id: `fleet-${index + 1}`,
    name: resource.name,
    type: resource.type,
    region,
    category:
      resource.status === "ORPHANED" ? "Unused" : status.charAt(0).toUpperCase() + status.slice(1),
    waste: resource.score,
    carbon: Math.round(resourceIntelligence[index]!.carbonImpact),
    cost: Math.round(resourceIntelligence[index]!.monthlyCost),
    risk: resource.risk === "Critical" ? "High" : resource.risk,
    confidence: Math.min(99, Math.max(60, resource.score)),
    action,
    why: `${resource.status.charAt(0)}${resource.status.slice(1).toLowerCase()} ${resource.type.toLowerCase()} in the ${resource.environment.toLowerCase()} environment · ${resourceIntelligence[index]!.utilization}% average utilization.`,
  };
});

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Command Center — CloudCurb AI" },
      {
        name: "description",
        content:
          "Explore 500 cloud resources, ₹1.86 Cr monthly spend, 48.6 tonnes CO₂e and protected production in the CloudCurb command center.",
      },
      { property: "og:title", content: "Command Center — CloudCurb AI" },
      {
        property: "og:description",
        content:
          "Your cloud telemetry, 3D infrastructure and carbon-aware decision pipeline in one command center.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});
function Dashboard() {
  const pilotState = usePilotState();
  const verifiedImpact = getVerifiedImpact(pilotState.actions);
  const fleetResourceCount = resourceIntelligence.length;
  const wasteDetectedCount = resourceCounts.idle + resourceCounts.oversized;
  const currentMonthlyCost = Math.max(0, rawMetrics.monthlyCost - verifiedImpact.costSavingInr);
  const fleetCarbonTonnes =
    resourceIntelligence.reduce((total, resource) => total + resource.carbonImpact, 0) / 1000;
  const currentCarbonTonnes = Math.max(0, fleetCarbonTonnes - verifiedImpact.carbonSavingKg / 1000);
  const monthlyCarbonTrend = calculateMonthlyCarbonTrend(monthly, currentCarbonTonnes);
  const optimizationProjection = calculateOptimizationProjection(resourceIntelligence);
  const recommendationCount = opportunities.length;
  const pilotReadyCount = opportunities.filter((resource) => resource.risk !== "High").length;
  const [step, setStep] = useState(-1);
  const [showProjectedImpact, setShowProjectedImpact] = useState(true);
  const [paused, setPaused] = useState(false);
  const [exploded, setExploded] = useState(false);
  const [reset, setReset] = useState(0);
  const [scenePage, setScenePage] = useState(0);
  const [trendWindow, setTrendWindow] = useState(1);
  const [selected, setSelected] = useState("");
  const [inspected, setInspected] = useState(false);
  const selectedResource = inspected ? sceneResources.find((r) => r.id === selected) : undefined;
  const pageCount = Math.ceil(sceneResources.length / SCENE_PAGE_SIZE);
  const pageResources = sceneResources.slice(
    scenePage * SCENE_PAGE_SIZE,
    (scenePage + 1) * SCENE_PAGE_SIZE,
  );
  const selectResource = (id: string) => {
    setSelected(id);
    setInspected(true);
  };
  const goToScenePage = (page: number) => {
    setScenePage(Math.min(pageCount - 1, Math.max(0, page)));
    setInspected(false);
    setSelected("");
  };
  const [hoveredComposition, setHoveredComposition] = useState<string | null>(null);
  useEffect(() => {
    if (step < 0 || step >= decisionSteps.length) return;
    const timer = setTimeout(() => setStep((s) => s + 1), 800);
    return () => clearTimeout(timer);
  }, [step]);
  const done = step >= decisionSteps.length;
  const running = step >= 0 && !done;
  const efficiencyScore = done
    ? Math.min(
        100,
        64 +
          Math.round(
            (optimizationProjection.costReductionPercent +
              optimizationProjection.energyReductionPercent) /
              2,
          ),
      )
    : 64;
  const trendStartIndex = trendWindow * TREND_WINDOW_SIZE;
  const trendMonths = monthlyCarbonTrend.slice(
    trendStartIndex,
    trendStartIndex + TREND_WINDOW_SIZE,
  );
  const projectedTrendMonths = trendMonths.map((item) => ({
    ...item,
    tonnes:
      Math.round(item.tonnes * (1 - optimizationProjection.carbonReductionPercent / 100) * 10) / 10,
  }));
  const trendScaleValues = [
    ...monthlyCarbonTrend.map((item) => item.tonnes),
    ...monthlyCarbonTrend.map(
      (item) => item.tonnes * (1 - optimizationProjection.carbonReductionPercent / 100),
    ),
  ];
  const savingsCost = currentMonthlyCost * (optimizationProjection.costReductionPercent / 100);
  const projectedMonthlyCost = currentMonthlyCost - savingsCost;
  const projectedCarbon =
    currentCarbonTonnes * (1 - optimizationProjection.carbonReductionPercent / 100);
  const currentEnergyMwh = fleetEnergyMwh - verifiedImpact.energySavingKwh / 1000;
  const projectedEnergyMwh =
    currentEnergyMwh * (1 - optimizationProjection.energyReductionPercent / 100);
  let compositionAngle = 0;
  const compositionGradient = resourceComposition
    .map((item) => {
      const start = compositionAngle;
      compositionAngle += (item.value / fleetResourceCount) * 360;
      return `var(--${item.tone}) ${start}deg ${compositionAngle}deg`;
    })
    .join(", ");
  return (
    <div className="space-y-5">
      <div>
        <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/dashboard">Workspace</Link>
          <ChevronRight size={10} />
          <span>Overview</span>
        </div>
        <div className="page-heading">
          <div>
            <h1>Command Center</h1>
          </div>
          <Button
            size="sm"
            disabled={running}
            onClick={() => {
              setShowProjectedImpact(true);
              setStep(0);
            }}
          >
            {done ? (
              <>
                <Brain />
                Run analysis again
              </>
            ) : running ? (
              <>
                <Sparkles className="animate-pulse" />
                Analyzing…
              </>
            ) : (
              <>
                <Brain />
                Activate CurbBrain AI
              </>
            )}
          </Button>
        </div>
      </div>
      <div className="metrics-row dashboard-metrics">
        {[
          {
            key: "resources",
            label: "TOTAL RESOURCES",
            value: String(fleetResourceCount),
            note: "Across AWS, Azure & GCP",
            icon: Server,
            to: "/resource" as const,
            description: "A snapshot of the cloud fleet across all connected providers.",
            details: [
              ["Idle", String(resourceCounts.idle)],
              ["Oversized", String(resourceCounts.oversized)],
              ["Protected", String(resourceCounts.protected)],
            ],
          },
          {
            key: "cost",
            label: done ? "PROJECTED MONTHLY CLOUD COST" : "MONTHLY CLOUD COST",
            value: formatInrCompact(done ? projectedMonthlyCost : currentMonthlyCost),
            note: done
              ? `−${optimizationProjection.costReductionPercent}% estimated · now ${formatInrCompact(currentMonthlyCost)}`
              : verifiedImpact.actionCount > 0
                ? `${formatInrCompact(verifiedImpact.costSavingInr)} saved by ${verifiedImpact.actionCount} verified action${verifiedImpact.actionCount === 1 ? "" : "s"}`
                : "Current monthly spend",
            icon: ArrowUpRight,
            to: "/opportunities" as const,
            description: "Monthly spend across the cloud environment.",
            details: [
              ["Current spend", `${formatInrCompact(currentMonthlyCost)} / month`],
              ["Projected with AI", `${formatInrCompact(projectedMonthlyCost)} / month`],
              ["Potential saving", `${formatInrCompact(savingsCost)} / month`],
              ...(verifiedImpact.actionCount > 0
                ? [
                    [
                      "Verified CurbPilot savings",
                      `${formatInrCompact(verifiedImpact.costSavingInr)} / month`,
                    ] as [string, string],
                  ]
                : []),
              ["Potential reduction", `${optimizationProjection.costReductionPercent}%`],
            ],
          },
          {
            key: "carbon",
            label: done ? "PROJECTED MONTHLY CO₂e" : "MONTHLY CO₂e EMISSIONS",
            value: `${(done ? projectedCarbon : currentCarbonTonnes).toFixed(1)} t`,
            note: done
              ? `−${optimizationProjection.carbonReductionPercent}% estimated · current ${currentCarbonTonnes.toFixed(1)} t until verified`
              : verifiedImpact.actionCount > 0
                ? `${formatNumber(verifiedImpact.carbonSavingKg)} kg reduced by verified actions`
                : `Calculated from ${fleetResourceCount} resource estimates`,
            icon: Leaf,
            to: "/impact" as const,
            description: "Estimated carbon emissions from the current workload.",
            details: [
              ["Current footprint", `${currentCarbonTonnes.toFixed(2)} t CO₂e / month`],
              ["Energy use", `${currentEnergyMwh.toFixed(1)} MWh / month`],
              ["Tracked resources", String(fleetResourceCount)],
              [
                "Average per resource",
                `${((currentCarbonTonnes * 1000) / fleetResourceCount).toFixed(1)} kg CO₂e / month`,
              ],
              ["Projected with AI", `${projectedCarbon.toFixed(2)} t CO₂e / month`],
              ["Potential reduction", `${optimizationProjection.carbonReductionPercent}%`],
            ],
          },
          {
            key: "waste",
            label: done ? "AI RECOMMENDATIONS" : "WASTE DETECTED",
            value: String(done ? recommendationCount : wasteDetectedCount),
            note: done
              ? `${pilotReadyCount} ready for CurbPilot · ${recommendationCount - pilotReadyCount} need manual review`
              : `Idle + oversized · ${((wasteDetectedCount / fleetResourceCount) * 100).toFixed(0)}% of resources`,
            icon: TriangleAlert,
            to: "/opportunities" as const,
            description: "Resources flagged for review by the CurbBrain analysis.",
            details: [
              ["Idle resources", String(resourceCounts.idle)],
              ["Oversized resources", String(resourceCounts.oversized)],
              ["Total flagged", String(wasteDetectedCount)],
              ["Recommendations", String(recommendationCount)],
              ["Ready for CurbPilot", String(pilotReadyCount)],
            ],
          },
          {
            key: "protected",
            label: "PRODUCTION PROTECTED",
            value: `${rawMetrics.productionProtected}%`,
            note: "Policy guardrails enforced",
            icon: ShieldCheck,
            to: "/resource" as const,
            description: "Production resources are protected from automated optimization.",
            details: [
              ["Production coverage", `${rawMetrics.productionProtected}%`],
              ["Protected resources", String(resourceCounts.protected)],
              ["Automatic production changes", "Disabled"],
            ],
          },
        ].map((item) => (
          <Dialog key={item.key}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="metric-cell metric-link"
                aria-label={`${item.label}: ${item.value}. Open details`}
              >
                <span className="metric-label">
                  <span>{item.label}</span>
                  <item.icon size={12} />
                </span>
                <span
                  key={`${item.key}-${done && ["cost", "carbon", "waste"].includes(item.key) ? "projected" : "current"}`}
                  className={`metric-value${done && ["cost", "carbon", "waste"].includes(item.key) ? " metric-value-projected" : ""}`}
                >
                  {item.value}
                </span>
                <span className="metric-note">{item.note}</span>
                <span className="metric-open-hint">View details</span>
              </button>
            </DialogTrigger>
            <DialogContent className="metric-dialog">
              <DialogHeader className="metric-dialog-header">
                <DialogTitle>{item.label}</DialogTitle>
                <DialogDescription>{item.description}</DialogDescription>
              </DialogHeader>
              <div className="metric-dialog-value">{item.value}</div>
              <dl className="metric-dialog-details">
                {item.details.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              <Link to={item.to} className="metric-dialog-link">
                Open{" "}
                {item.key === "resources"
                  ? "resource intelligence"
                  : item.key === "cost" || item.key === "waste"
                    ? "AI Action Plan"
                    : item.key === "carbon"
                      ? "impact details"
                      : "protected resources"}
                <ArrowUpRight size={14} />
              </Link>
            </DialogContent>
          </Dialog>
        ))}
      </div>
      <div className="command-layout">
        <section className="command-stage" aria-label="Interactive 3D infrastructure">
          <div className="stage-header">
            <span className="flex items-center gap-2">
              <Layers3 size={13} className="text-primary" />
              Cloud infrastructure <span className="text-xs text-muted-foreground">/ 3D view</span>
            </span>
            <div className="stage-actions">
              <Button
                size="icon"
                variant="secondary"
                title={paused ? "Resume animation" : "Pause animation"}
                aria-label={paused ? "Resume animation" : "Pause animation"}
                onClick={() => setPaused(!paused)}
              >
                {paused ? <Play /> : <Pause />}
              </Button>
              <Button
                size="icon"
                variant={exploded ? "default" : "secondary"}
                title="Explode infrastructure"
                aria-label="Explode infrastructure"
                aria-pressed={exploded}
                onClick={() => setExploded(!exploded)}
              >
                <Layers3 />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                title="Reset view"
                aria-label="Reset view"
                onClick={() => setReset((k) => k + 1)}
              >
                <RotateCcw />
              </Button>
            </div>
          </div>
          <SceneView
            selected={selected}
            onSelect={selectResource}
            paused={paused}
            exploded={exploded}
            resetKey={reset}
            sceneResources={pageResources}
          />
          <div className="stage-gauge">
            <div className="gauge-svg">
              <svg viewBox="0 0 100 100" aria-hidden="true">
                <defs>
                  <linearGradient id="gauge-grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" />
                    <stop offset="100%" stopColor="var(--warn)" />
                  </linearGradient>
                </defs>
                <circle cx="50" cy="50" r="42" className="gauge-track" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="gauge-value"
                  stroke="url(#gauge-grad)"
                  strokeDasharray={`${efficiencyScore * 2.639} 264`}
                />
              </svg>
              <div className="gauge-label">
                <strong>{efficiencyScore}</strong>
                <span>/100</span>
              </div>
            </div>
            <div className="gauge-title">Efficiency score</div>
            <div className={`gauge-delta ${done ? "up" : ""}`}>
              {done ? `▲ +${efficiencyScore - 64} after AI` : "Grade C · needs tuning"}
            </div>
          </div>
          <div className="stage-caption">
            <strong className="flex items-center gap-2">
              <span className="status-dot" />
              {done ? "Intelligence layer active" : "Raw cloud environment"}
            </strong>
            <p>
              {done
                ? "Waste detected · production remains protected"
                : "Monitoring current resource state · no AI decisions applied"}
            </p>
          </div>
        </section>
        <aside className="pipeline-panel">
          <h2>CurbBrain decision pipeline</h2>
          <div className="pipeline-status" aria-live="polite">
            <span>SYSTEM STATUS</span>
            <strong className={done ? "text-primary" : ""}>
              {done ? "RECOMMENDATIONS READY" : running ? "ANALYZING" : "MONITORING"}
            </strong>
            <p className="mt-2 text-xs text-muted-foreground">
              {done
                ? `${recommendationCount} recommendations ready · ${wasteDetectedCount} resources flagged`
                : running
                  ? "Processing telemetry"
                  : "Awaiting AI activation"}
            </p>
            {selectedResource && (
              <div className="selected-resource-output">
                <h3>{selectedResource.name}</h3>
                <p>
                  {selectedResource.type} · {selectedResource.region}
                </p>
                <dl>
                  <div>
                    <dt>Classification</dt>
                    <dd>{selectedResource.category}</dd>
                  </div>
                  <div>
                    <dt>Waste score</dt>
                    <dd>{selectedResource.waste}/100</dd>
                  </div>
                  <div>
                    <dt>CO₂e / month</dt>
                    <dd>{formatNumber(selectedResource.carbon)} kg</dd>
                  </div>
                  <div>
                    <dt>Cost / month</dt>
                    <dd>{formatInrCompact(selectedResource.cost)}</dd>
                  </div>
                  <div>
                    <dt>Risk / confidence</dt>
                    <dd>
                      {selectedResource.risk} · {selectedResource.confidence}%
                    </dd>
                  </div>
                </dl>
                <p>{selectedResource.why}</p>
                <strong className="resource-recommendation">{selectedResource.action}</strong>
              </div>
            )}
          </div>
          {decisionSteps.map(([title, detail], i) => (
            <div key={title} className={`pipeline-step ${i <= step ? "active" : ""}`}>
              <span className="pipeline-step-index">{i < step ? <Check size={11} /> : i + 1}</span>
              <div>
                <strong>{title}</strong>
                <p>{detail}</p>
              </div>
            </div>
          ))}
        </aside>
      </div>
      <nav className="scene-pagination" aria-label="Infrastructure server pages">
        <div className="scene-pagination-copy">
          <strong>Infrastructure servers</strong>
          <span>
            Showing {scenePage * SCENE_PAGE_SIZE + 1}–
            {Math.min((scenePage + 1) * SCENE_PAGE_SIZE, sceneResources.length)} of{" "}
            {sceneResources.length}
          </span>
        </div>
        <div className="scene-pagination-controls">
          <Button
            size="sm"
            variant="outline"
            aria-label="First server group"
            disabled={scenePage === 0}
            onClick={() => goToScenePage(0)}
          >
            <ChevronsLeft />
            First
          </Button>
          <Button
            size="sm"
            variant="outline"
            aria-label="Previous server group"
            disabled={scenePage === 0}
            onClick={() => goToScenePage(scenePage - 1)}
          >
            <ChevronLeft />
            Previous
          </Button>
          <span className="scene-page-number">
            Group {scenePage + 1} / {pageCount}
          </span>
          <Button
            size="sm"
            variant="outline"
            aria-label="Next server group"
            disabled={scenePage >= pageCount - 1}
            onClick={() => goToScenePage(scenePage + 1)}
          >
            Next
            <ChevronRight />
          </Button>
          <Button
            size="sm"
            variant="outline"
            aria-label="Last server group"
            disabled={scenePage >= pageCount - 1}
            onClick={() => goToScenePage(pageCount - 1)}
          >
            Last
            <ChevronsRight />
          </Button>
        </div>
      </nav>
      <section className="overview-analytics" aria-label="Cloud cost and carbon overview">
        <article className="overview-panel trend-panel">
          <div className="overview-panel-heading">
            <h2>Cloud CO₂e emissions</h2>
            <div className="trend-period-controls" aria-label="Trend date range">
              <Button
                size="sm"
                variant="outline"
                aria-label="Show previous 6 months"
                disabled={trendWindow === 0}
                onClick={() => setTrendWindow(0)}
              >
                <ChevronLeft />
                Previous
              </Button>
              <span className="trend-period">
                {trendMonths[0]!.m}–{trendMonths[trendMonths.length - 1]!.m}
              </span>
              <Button
                size="sm"
                variant="outline"
                aria-label="Show next 6 months"
                disabled={trendWindow === 1}
                onClick={() => setTrendWindow(1)}
              >
                Next
                <ChevronRight />
              </Button>
            </div>
          </div>
          <p className="overview-muted">
            Monthly tonnes of CO₂e.{" "}
            {done
              ? `The dashed line shows the same months with the recommended changes applied (−${optimizationProjection.carbonReductionPercent}%).`
              : `This month: ${currentCarbonTonnes.toFixed(1)} t.`}
          </p>
          <TrendChart
            months={trendMonths}
            projected={done ? projectedTrendMonths : undefined}
            scaleValues={trendScaleValues}
            label={`Monthly CO₂e emissions from ${trendMonths[0]!.m} to ${trendMonths[trendMonths.length - 1]!.m}, in tonnes`}
          />
          <div className="trend-controls" aria-label="Trend series">
            <span className="trend-dot trend-dot-co2" />
            <span className="overview-muted">Current emissions</span>
            {done && (
              <>
                <span className="trend-dot trend-dot-projected" />
                <span className="overview-muted">With AI recommendations</span>
              </>
            )}
          </div>
        </article>
      </section>
      <section
        className="overview-panel resource-composition-panel"
        aria-label="Resource composition"
      >
        <div className="overview-panel-heading">
          <h2>Resource composition</h2>
          <span className="text-xs text-muted-foreground">{fleetResourceCount} resources</span>
        </div>
        <div className="composition-chart-layout">
          <div
            className="composition-donut"
            role="img"
            aria-label={`Resource composition: ${resourceComposition.map(({ label, value }) => `${label} ${value}`).join(", ")}`}
            style={{ background: `conic-gradient(${compositionGradient})` }}
          >
            <div className="composition-donut-center">
              <strong>{fleetResourceCount}</strong>
              <span>resources</span>
            </div>
          </div>
          <div className="composition-bars" aria-label="Resource counts by category">
            {resourceComposition.map((item, index) => {
              const percentage = (item.value / fleetResourceCount) * 100;
              return (
                <Link
                  key={item.label}
                  to="/resource"
                  search={{
                    query: "",
                    environment: "All",
                    status: item.label === "Other" ? "All" : item.label,
                  }}
                  className={`composition-bar-row${hoveredComposition === item.label ? " is-active" : ""}`}
                  onMouseEnter={() => setHoveredComposition(item.label)}
                  onMouseLeave={() => setHoveredComposition(null)}
                  onFocus={() => setHoveredComposition(item.label)}
                  onBlur={() => setHoveredComposition(null)}
                  aria-label={`${item.label}: ${item.value} resources, ${percentage.toFixed(1)} percent`}
                >
                  <span className="composition-bar-label">
                    <span className={`composition-dot composition-${item.tone}`} />
                    {item.label}
                  </span>
                  <span className="composition-bar-track" aria-hidden="true">
                    <span
                      className={`composition-bar-fill composition-${item.tone}`}
                      style={{
                        width: `${percentage}%`,
                        animationDelay: `${index * 140}ms`,
                      }}
                    />
                  </span>
                  <strong className="composition-bar-count">{item.value}</strong>
                  <span className="composition-bar-percent">{percentage.toFixed(1)}%</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
      <section
        className="overview-panel dashboard-action-center"
        aria-label="CurbPilot action center"
      >
        <div className="overview-panel-heading">
          <h2>CurbPilot action center</h2>
          <ShieldCheck size={18} className="text-primary" />
        </div>
        {done ? (
          <div className="dashboard-action-ready">
            <p className="text-sm text-primary">
              {recommendationCount} recommendations are ready to review · {pilotReadyCount} can run
              through CurbPilot.
            </p>
            <p className="overview-muted">
              Analysis shows estimates only. Current totals change only after a CurbPilot action is
              approved and verified.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link to="/opportunities">
                  Review recommendations <ArrowUpRight />
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/pilot">Open CurbPilot</Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-primary">
              <ShieldCheck size={18} />
            </div>
            <strong className="text-sm">Safety comes first.</strong>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Activate AI to generate recommendations. Production resources are protected by
              default.
            </p>
            <div className="action-item mt-5">
              <p className="flex items-center gap-2">
                <span className="status-dot" />
                No actions applied
              </p>
            </div>
          </>
        )}
        <Button asChild variant="ghost" size="sm" className="mt-3">
          <Link to="/pilot">
            View action policies <ArrowUpRight />
          </Link>
        </Button>
      </section>
      {done && (
        <section
          className="overview-panel optimization-comparison compact-optimization-comparison"
          aria-label="Before and after AI optimization comparison"
        >
          <div className="overview-panel-heading">
            <h2>Before vs after recommended changes</h2>
            <Button
              size="sm"
              variant="outline"
              aria-pressed={showProjectedImpact}
              onClick={() => setShowProjectedImpact((visible) => !visible)}
            >
              {showProjectedImpact ? "Hide projection" : "Show projection"}
            </Button>
          </div>
          <p className="overview-muted">
            Estimated monthly impact based on non-production idle and oversized resources. These
            changes are recommendations, not applied cloud changes.
          </p>
          <div className="comparison-grid">
            <div className="comparison-header">
              <span>Metric</span>
              <span>Before AI</span>
              <span>After AI · projected</span>
            </div>
            {[
              {
                label: "Cloud cost",
                before: formatInrCompact(currentMonthlyCost),
                after: formatInrCompact(projectedMonthlyCost),
                reduction: optimizationProjection.costReductionPercent,
                tone: "primary",
              },
              {
                label: "Energy use",
                before: `${currentEnergyMwh.toFixed(1)} MWh`,
                after: `${projectedEnergyMwh.toFixed(1)} MWh`,
                reduction: optimizationProjection.energyReductionPercent,
                tone: "warn",
              },
              {
                label: "CO₂ emissions",
                before: `${currentCarbonTonnes.toFixed(1)} t`,
                after: `${projectedCarbon.toFixed(1)} t`,
                reduction: optimizationProjection.carbonReductionPercent,
                tone: "info",
              },
            ].map((metric) => (
              <div className="comparison-row" key={metric.label}>
                <strong>{metric.label}</strong>
                <span>{metric.before}</span>
                <div className="comparison-after">
                  <span>
                    {showProjectedImpact ? metric.after : "Hidden"}
                    {showProjectedImpact && (
                      <strong className={`comparison-reduction reduction-${metric.tone}`}>
                        −{metric.reduction}%
                      </strong>
                    )}
                  </span>
                  {showProjectedImpact && (
                    <div
                      className="comparison-track"
                      role="img"
                      aria-label={`${metric.reduction}% projected reduction in ${metric.label}`}
                    >
                      <span style={{ width: `${100 - metric.reduction}%` }} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      <details className="dashboard-insights">
        <summary>Impact & audit summary</summary>
        <div className="dashboard-insights-content">
          <section className="impact-audit-overview" aria-label="Impact and audit summary">
            <article className="overview-panel impact-summary-panel">
              <div className="overview-panel-heading">
                <h2>Impact summary · {impactSummary.periodLabel.toLowerCase()}</h2>
                <Leaf size={18} className="text-primary" />
              </div>
              <div className="impact-summary-grid">
                <div>
                  <span>CO₂ avoided</span>
                  <strong>
                    {(
                      impactSummary.carbonAvoidedTonnes +
                      verifiedImpact.carbonSavingKg / 1000
                    ).toFixed(1)}{" "}
                    t
                  </strong>
                </div>
                <div>
                  <span>Energy saved</span>
                  <strong>
                    {(impactSummary.energySavedMwh + verifiedImpact.energySavingKwh / 1000).toFixed(
                      1,
                    )}{" "}
                    MWh
                  </strong>
                </div>
                <div>
                  <span>Cost saved</span>
                  <strong>
                    {formatInrCompact(impactSummary.costSavedInr + verifiedImpact.costSavingInr)}
                  </strong>
                </div>
                <div>
                  <span>Actions executed</span>
                  <strong>
                    {formatNumber(impactSummary.actionsExecuted + verifiedImpact.actionCount)}
                  </strong>
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="mt-5 w-full">
                <Link to="/impact">
                  Open impact & audit <ArrowUpRight />
                </Link>
              </Button>
            </article>
            <article className="overview-panel audit-summary-panel">
              <div className="overview-panel-heading">
                <h2>Audit summary</h2>
                <Clock3 size={18} className="text-primary" />
              </div>
              <ol className="audit-summary-list">
                {audit.slice(0, 3).map((entry) => (
                  <li key={`${entry.t}-${entry.msg}`}>
                    <span className="audit-summary-time">{entry.t}</span>
                    <strong>{entry.tag}</strong>
                    <p>{entry.msg}</p>
                  </li>
                ))}
              </ol>
              <Button asChild variant="ghost" size="sm" className="mt-3">
                <Link to="/impact">
                  View full audit trail <ArrowUpRight />
                </Link>
              </Button>
            </article>
          </section>
        </div>
      </details>
    </div>
  );
}

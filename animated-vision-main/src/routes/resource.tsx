import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Boxes,
  BrainCircuit,
  Cpu,
  Database,
  Flame,
  HardDrive,
  Lightbulb,
  Moon,
  Scaling,
  Search,
  ShieldCheck,
  Trash2,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { resources } from "@/lib/data";
import { formatInr, formatInrCompact, formatNumber } from "@/lib/format";
import {
  resourceCounts,
  filterResourceSummary,
  getServerInsight,
  resourceCompositionDetails,
  resourceIntelligence,
  serverInsightGroups,
  type ResourceIntelligenceRow,
} from "@/lib/raw-cloud";

const resourceIntelligenceByName = new Map(
  resourceIntelligence.map((resource) => [resource.name, resource]),
);
const categoryIcons = {
  CPU: Cpu,
  GPU: Flame,
  Storage: HardDrive,
  Database: Database,
  Kubernetes: Boxes,
  "AI workload": BrainCircuit,
} as const;
const insightCards = [
  {
    id: "idle",
    status: "Idle",
    icon: Moon,
    tone: "primary",
    title: "Idle servers",
    group: serverInsightGroups.idle,
    detail: `${serverInsightGroups.idle.averageUtilization}% average utilization · idle ${serverInsightGroups.idle.averageIdleDays} days on average`,
    action: `Stop them outside business hours to save ≈ ${formatInrCompact(serverInsightGroups.idle.potentialSaving)} a month.`,
  },
  {
    id: "oversized",
    status: "Oversized",
    icon: Scaling,
    tone: "warn",
    title: "Oversized servers",
    group: serverInsightGroups.oversized,
    detail: `Only ${serverInsightGroups.oversized.averageUtilization}% of paid capacity is used`,
    action: `Rightsizing saves ≈ ${formatInrCompact(serverInsightGroups.oversized.potentialSaving)} a month.`,
  },
  {
    id: "unused",
    status: "Unused",
    icon: Trash2,
    tone: "danger",
    title: "Unused resources",
    group: serverInsightGroups.unused,
    detail: `Unattached for ${serverInsightGroups.unused.averageIdleDays} days on average`,
    action: `Deleting them after an owner check saves ${formatInrCompact(serverInsightGroups.unused.monthlyCost)} a month.`,
  },
  {
    id: "hotspots",
    status: "All",
    icon: Flame,
    tone: "danger",
    title: "Carbon hotspots",
    group: serverInsightGroups.hotspots,
    detail: `The top 10 servers emit ${serverInsightGroups.hotspots.sharePercent}% of fleet CO₂e`,
    action: "Mostly GPU and AI workloads: move flexible runs into low-carbon hours.",
  },
  {
    id: "protected",
    status: "Protected",
    icon: ShieldCheck,
    tone: "info",
    title: "Protected production",
    group: serverInsightGroups.protected,
    detail: `${serverInsightGroups.protected.averageUtilization}% average utilization`,
    action: "CurbPilot never changes these automatically.",
  },
] as const;

export const Route = createFileRoute("/resource")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { id?: string; query?: string; environment?: string; status?: string } => ({
    ...(typeof s["id"] === "string" ? { id: s["id"] } : {}),
    ...(typeof s["query"] === "string" ? { query: s["query"] } : {}),
    ...(typeof s["environment"] === "string" ? { environment: s["environment"] } : {}),
    ...(typeof s["status"] === "string" ? { status: s["status"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Resource Intelligence — CloudCurb AI" },
      {
        name: "description",
        content:
          "Browse cloud resources by name, type, utilization, monthly cost, CO₂e emissions and status.",
      },
      { property: "og:title", content: "Resource Intelligence — CloudCurb AI" },
      {
        property: "og:description",
        content: "A clear view of resource utilization, monthly cost, CO₂e and status.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResourcePage,
});

function ServerInsightPanel({ resource }: { resource: ResourceIntelligenceRow }) {
  const insight = getServerInsight(resource);
  return (
    <article
      key={resource.name}
      className={`server-insight-panel server-insight-${insight.tone}`}
      aria-live="polite"
    >
      <div className="server-insight-heading">
        <span className="server-insight-icon">
          <Lightbulb size={18} />
        </span>
        <div>
          <span className="server-insight-label">Server insight</span>
          <h3>{resource.name}</h3>
          <p>
            {resource.type} · {resource.environment} · {resource.owner}
          </p>
        </div>
        <span className={`status-tag status-${resource.status.toLowerCase()}`}>
          {resource.status}
        </span>
      </div>
      <div className="server-insight-gauge" aria-label={`${resource.utilization}% utilization`}>
        <div>
          <span>Utilization</span>
          <strong>{resource.utilization}%</strong>
        </div>
        <div className="server-insight-track">
          <span style={{ width: `${Math.max(2, resource.utilization)}%` }} />
        </div>
      </div>
      <dl className="server-insight-metrics">
        <div>
          <dt>Monthly cost</dt>
          <dd>{formatInr(resource.monthlyCost)}</dd>
        </div>
        <div>
          <dt>CO₂e / month</dt>
          <dd>{formatNumber(resource.carbonImpact, 1)} kg</dd>
        </div>
        <div>
          <dt>CPU · RAM</dt>
          <dd>
            {resource.cpu} · {resource.ram}
          </dd>
        </div>
        <div>
          <dt>Idle for</dt>
          <dd>{resource.idle}</dd>
        </div>
        <div>
          <dt>Risk</dt>
          <dd>{resource.risk}</dd>
        </div>
        <div>
          <dt>Carbon rank</dt>
          <dd>
            #{insight.carbonRank} of {resourceIntelligence.length}
          </dd>
        </div>
      </dl>
      <div className="server-insight-copy">
        <strong>{insight.headline}</strong>
        <p>{insight.detail}</p>
        <p className="server-insight-action">
          {insight.action}
          {insight.savingInr > 0 && <em> Saves ≈ {formatInr(insight.savingInr)} a month.</em>}
        </p>
      </div>
    </article>
  );
}

function ResourcePage() {
  const search = Route.useSearch();
  const [query, setQuery] = useState(search.query ?? "");
  const [environment, setEnvironment] = useState(search.environment ?? "All");
  const [status, setStatus] = useState(search.status ?? "All");
  const [page, setPage] = useState(0);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const insightRef = useRef<HTMLDivElement>(null);
  const rows = filterResourceSummary(query, environment, status).flatMap((resource) => {
    const intelligence = resourceIntelligenceByName.get(resource.name);
    return intelligence ? [intelligence] : [];
  });
  const pageSize = 50;
  const pageCount = Math.ceil(rows.length / pageSize);
  const visibleRows = rows.slice(page * pageSize, (page + 1) * pageSize);
  const selected = rows.find((resource) => resource.name === selectedName) ?? rows[0];
  const largestCategoryCost = Math.max(
    ...resourceCompositionDetails.map((item) => item.monthlyCost),
  );
  useEffect(() => {
    const resource = resources.find((item) => item.id === search.id);
    if (resource) setQuery(resource.name);
  }, [search.id]);
  const showStatus = (nextStatus: string) => {
    setStatus(nextStatus);
    setEnvironment("All");
    setQuery("");
    setPage(0);
    setSelectedName(null);
  };
  const selectServer = (name: string) => {
    setSelectedName(name);
    insightRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };
  return (
    <div className="space-y-6">
      <div className="page-heading">
        <h1>Resource Intelligence</h1>
      </div>
      <div className="metrics-row resource-summary-metrics">
        {[
          ["Total", resourceCounts.total],
          ["Idle", resourceCounts.idle],
          ["Oversized", resourceCounts.oversized],
          ["Protected", resourceCounts.protected],
        ].map(([label, value]) => (
          <div className="metric-cell" key={label}>
            <div className="metric-label">{label}</div>
            <div className="metric-value">{value}</div>
          </div>
        ))}
      </div>
      <section className="server-insights" aria-labelledby="server-insights-heading">
        <div className="resource-intelligence-section-heading">
          <div>
            <h2 id="server-insights-heading">Server insights</h2>
            <p>What CurbBrain found across all {resourceIntelligence.length} servers.</p>
          </div>
        </div>
        <div className="server-insight-grid">
          {insightCards.map((card, index) => (
            <button
              type="button"
              key={card.id}
              className={`server-insight-card server-insight-${card.tone}`}
              style={{ animationDelay: `${index * 80}ms` }}
              onClick={() => showStatus(card.status)}
              aria-label={`${card.title}: show matching servers`}
            >
              <span className="server-insight-card-heading">
                <span className="server-insight-icon">
                  <card.icon size={17} />
                </span>
                {card.title}
              </span>
              <strong>{card.group.count}</strong>
              <span className="server-insight-card-figures">
                {formatInrCompact(card.group.monthlyCost)} / month ·{" "}
                {formatNumber(card.group.carbonKg)} kg CO₂e
              </span>
              <span className="server-insight-card-detail">{card.detail}</span>
              <span className="server-insight-card-action">{card.action}</span>
            </button>
          ))}
        </div>
        <div className="resource-category-grid" aria-label="Servers by type">
          {resourceCompositionDetails.map((item) => {
            const Icon = categoryIcons[item.category];
            return (
              <article className="resource-category-card" key={item.category}>
                <div className="resource-category-heading">
                  <span className="resource-category-icon">
                    <Icon size={15} />
                  </span>
                  {item.category}
                  <strong>{item.count}</strong>
                </div>
                <div className="resource-category-track" aria-hidden="true">
                  <span style={{ width: `${(item.monthlyCost / largestCategoryCost) * 100}%` }} />
                </div>
                <dl>
                  <div>
                    <dt>Monthly cost</dt>
                    <dd>{formatInrCompact(item.monthlyCost)}</dd>
                  </div>
                  <div>
                    <dt>CO₂e / month</dt>
                    <dd>{formatNumber(item.carbonImpact)} kg</dd>
                  </div>
                  <div>
                    <dt>Avg utilization</dt>
                    <dd>{item.utilization}%</dd>
                  </div>
                  <div>
                    <dt>Share of fleet</dt>
                    <dd>{((item.count / resourceIntelligence.length) * 100).toFixed(0)}%</dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>
      </section>
      <section className="resource-table-section" aria-label="Resource summary table">
        <div className="resource-intelligence-section-heading resource-table-heading">
          <div>
            <h2>Cloud resources</h2>
            <p>Monthly cost and carbon for each resource. Select a row to see its insight.</p>
          </div>
          <span className="resource-composition-total">{rows.length} matching</span>
        </div>
        <div className="resource-filters">
          <label className="resource-search">
            <Search size={16} />
            <input
              aria-label="Search resource"
              placeholder="Search resource…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
          </label>
          <select
            aria-label="Filter environments"
            value={environment}
            onChange={(e) => {
              setEnvironment(e.target.value);
              setPage(0);
            }}
          >
            <option value="All">All environments</option>
            {[
              "Production",
              "Development",
              "Testing",
              "Staging",
              "Non-prod",
              "Flexible",
              "Unclassified",
            ].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <select
            aria-label="Filter statuses"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
          >
            <option value="All">All statuses</option>
            {["Idle", "Oversized", "Protected", "Unused", "Scheduled", "Active"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </div>
        <div ref={insightRef} className="server-insight-anchor">
          {selected && <ServerInsightPanel resource={selected} />}
        </div>
        <div className="table-scroll resource-table-scroll">
          <table className="telemetry-table resource-intelligence-table">
            <thead>
              <tr>
                <th scope="col">Resource name</th>
                <th scope="col">Type</th>
                <th scope="col">Utilization</th>
                <th scope="col">Monthly cost</th>
                <th scope="col">CO₂e / month</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((resource) => (
                <tr
                  key={resource.name}
                  className={resource.name === selected?.name ? "is-selected" : undefined}
                  onClick={() => selectServer(resource.name)}
                >
                  <th scope="row" className="resource-table-name">
                    <button
                      type="button"
                      className="resource-row-select"
                      aria-pressed={resource.name === selected?.name}
                      onClick={(event) => {
                        event.stopPropagation();
                        selectServer(resource.name);
                      }}
                    >
                      {resource.name}
                    </button>
                  </th>
                  <td>{resource.type}</td>
                  <td>
                    <span className="resource-table-utilization">{resource.utilization}%</span>
                  </td>
                  <td>{formatInr(resource.monthlyCost)}</td>
                  <td>{formatNumber(resource.carbonImpact, 1)} kg</td>
                  <td>
                    <span className={`status-tag status-${resource.status.toLowerCase()}`}>
                      {resource.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pageCount > 1 && (
          <div className="resource-pagination">
            <span>
              Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, rows.length)} of{" "}
              {rows.length}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 0}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= pageCount - 1}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
        {rows.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <Workflow className="mx-auto mb-3" />
            No matching resources.
            <Button variant="ghost" className="ml-2" onClick={() => showStatus("All")}>
              Clear filters
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

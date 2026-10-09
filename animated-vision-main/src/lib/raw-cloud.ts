import { CARBON_KG_PER_KWH, monthly } from "@/lib/data";

export const rawMetrics = {
  resources: 500,
  monthlyCost: 18_600_000,
  carbonTonnes: 48.6,
  productionProtected: 100,
  wasteDetected: 109,
};
/** Fleet energy use per month, derived from emissions: 48.6 t ÷ 0.35 kg/kWh ≈ 138.9 MWh. */
export const fleetEnergyMwh = rawMetrics.carbonTonnes / CARBON_KG_PER_KWH;
const HOURS_PER_MONTH = 730;
const averageKwPerResource = (fleetEnergyMwh * 1000) / (rawMetrics.resources * HOURS_PER_MONTH);
/** Converts saved energy into resource-hours at the fleet's average power draw. */
export function resourceHoursFromKwh(kwh: number) {
  return kwh / averageKwPerResource;
}
// Past months keep their recorded values; the current month reflects verified savings.
export function calculateMonthlyCarbonTrend(
  months: readonly { m: string; co2: number }[],
  currentTonnes: number,
) {
  const baseline = months.at(-1)?.co2;
  if (!Number.isFinite(currentTonnes) || currentTonnes < 0) {
    throw new RangeError("Current monthly emissions must be a finite non-negative number.");
  }
  if (baseline === undefined || !Number.isFinite(baseline) || baseline <= 0) {
    throw new RangeError("Monthly carbon trend must end with a positive finite baseline.");
  }
  const scale = rawMetrics.carbonTonnes / baseline;
  return months.map(({ m, co2 }, index) => {
    if (!Number.isFinite(co2) || co2 < 0) {
      throw new RangeError(`Monthly carbon value for ${m} must be finite and non-negative.`);
    }
    const tonnes = index === months.length - 1 ? currentTonnes : co2 * scale;
    return { m, tonnes: Math.round(tonnes * 100) / 100 };
  });
}
// Savings over the last 12 months, measured against the first month of the trend.
const trendStart = monthly[0]!;
const carbonAvoidedTonnes =
  Math.round(monthly.reduce((total, month) => total + (trendStart.co2 - month.co2), 0) * 10) / 10;
const energySavedMwh = Math.round((carbonAvoidedTonnes / CARBON_KG_PER_KWH) * 10) / 10;
export const impactSummary = {
  periodLabel: "Last 12 months",
  carbonAvoidedTonnes,
  energySavedMwh,
  costSavedInr: monthly.reduce((total, month) => total + (trendStart.cost - month.cost), 0),
  resourceHoursSaved: Math.round(resourceHoursFromKwh(energySavedMwh * 1000)),
  actionsExecuted: 386,
  slaMaintainedPercent: 99.98,
};
/** A mature tree absorbs about 22 kg of CO₂ a year. */
export function treesEquivalent(tonnes: number) {
  return Math.round((tonnes * 1000) / 22);
}
export const rawTelemetry = [
  {
    name: "vm-prod-01",
    cpu: "62%",
    ram: "71%",
    network: "High",
    environment: "PROD",
    status: "PROTECTED",
  },
  {
    name: "vm-dev-17",
    cpu: "0.4%",
    ram: "3%",
    network: "Near 0",
    environment: "DEV",
    status: "IDLE",
  },
  {
    name: "vm-dev-21",
    cpu: "1.1%",
    ram: "5%",
    network: "Near 0",
    environment: "DEV",
    status: "IDLE",
  },
  {
    name: "db-prod-03",
    cpu: "18%",
    ram: "82%",
    network: "High",
    environment: "PROD",
    status: "PROTECTED",
  },
  {
    name: "vm-analytics-08",
    cpu: "12%",
    ram: "14%",
    network: "Low",
    environment: "NON-PROD",
    status: "OVERSIZED",
  },
  {
    name: "storage-044",
    cpu: "0%",
    ram: "0%",
    network: "0",
    environment: "ORPHANED",
    status: "ORPHANED",
  },
  {
    name: "ml-batch-07",
    cpu: "8%",
    ram: "21%",
    network: "Medium",
    environment: "FLEXIBLE",
    status: "SCHEDULED",
  },
];
export const decisionSteps = [
  ["Detect", "Find waste patterns"],
  ["Understand", "Waste score + confidence"],
  ["CarbonLens", "Energy + CO₂e impact"],
  ["Policy Gate", "Auto / approval / protected"],
  ["Verify", "Confirm impact + safety"],
];
export function canOptimizeResource(resource: { environment: string; status: string }) {
  return resource.environment !== "PROD" && resource.status !== "PROTECTED";
}
export const resourceCounts = { total: 500, idle: 45, oversized: 64, protected: 31 };
export const resourceComposition = [
  { label: "Idle", value: resourceCounts.idle, tone: "primary" },
  { label: "Oversized", value: resourceCounts.oversized, tone: "warn" },
  { label: "Protected", value: resourceCounts.protected, tone: "info" },
  {
    label: "Other",
    value:
      resourceCounts.total -
      resourceCounts.idle -
      resourceCounts.oversized -
      resourceCounts.protected,
    tone: "muted-foreground",
  },
];
export type ResourceRow = {
  name: string;
  type: string;
  environment: string;
  status: string;
  cpu: string;
  ram: string;
  network: string;
  idle: string;
  risk: "Low" | "Medium" | "Critical";
  score: number;
};

// Pinned reference rows keep their exact values from the raw dashboard + Resource Intelligence screenshots.
const pinnedExtras: Record<
  string,
  { type: string; idle: string; risk: "Low" | "Medium" | "Critical"; score: number }
> = {
  "vm-prod-01": { type: "VM", idle: "0d", risk: "Medium", score: 34 },
  "vm-dev-17": { type: "VM", idle: "14d", risk: "Low", score: 97 },
  "vm-dev-21": { type: "VM", idle: "9d", risk: "Low", score: 95 },
  "db-prod-03": { type: "Database", idle: "0d", risk: "Medium", score: 30 },
  "vm-analytics-08": { type: "VM", idle: "6d", risk: "Medium", score: 88 },
  "storage-044": { type: "Volume", idle: "45d", risk: "Low", score: 99 },
  "ml-batch-07": { type: "GPU", idle: "2d", risk: "Low", score: 76 },
};
const pinnedSummary = [
  {
    name: "vm-dev-017",
    type: "VM",
    environment: "DEV",
    status: "IDLE",
    cpu: "0.3%",
    ram: "2%",
    network: "0",
    idle: "14d",
    risk: "Low" as const,
    score: 97,
  },
  {
    name: "vm-test-031",
    type: "VM",
    environment: "TEST",
    status: "IDLE",
    cpu: "0.8%",
    ram: "4%",
    network: "0",
    idle: "12d",
    risk: "Low" as const,
    score: 94,
  },
  {
    name: "vm-stage-009",
    type: "VM",
    environment: "STAGE",
    status: "OVERSIZED",
    cpu: "3%",
    ram: "8%",
    network: "Low",
    idle: "11d",
    risk: "Medium" as const,
    score: 88,
  },
  {
    name: "db-prod-003",
    type: "Database",
    environment: "PROD",
    status: "PROTECTED",
    cpu: "1%",
    ram: "5%",
    network: "Low",
    idle: "9d",
    risk: "Critical" as const,
    score: 95,
  },
  {
    name: "ml-prod-014",
    type: "GPU",
    environment: "PROD",
    status: "PROTECTED",
    cpu: "71%",
    ram: "78%",
    network: "High",
    idle: "0d",
    risk: "Critical" as const,
    score: 21,
  },
  {
    name: "disk-orphan-22",
    type: "Volume",
    environment: "DEV",
    status: "ORPHANED",
    cpu: "—",
    ram: "—",
    network: "0",
    idle: "30d",
    risk: "Low" as const,
    score: 99,
  },
  {
    name: "vm-dev-104",
    type: "VM",
    environment: "DEV",
    status: "OVERSIZED",
    cpu: "4%",
    ram: "7%",
    network: "Low",
    idle: "8d",
    risk: "Low" as const,
    score: 91,
  },
  {
    name: "backup-test-06",
    type: "Backup",
    environment: "TEST",
    status: "IDLE",
    cpu: "2%",
    ram: "5%",
    network: "Low",
    idle: "16d",
    risk: "Low" as const,
    score: 86,
  },
];

// Deterministic generator so every render shows the same 500 resources.
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
function buildAllResources(): ResourceRow[] {
  const rows: ResourceRow[] = [];
  const used = new Set<string>();
  const push = (r: ResourceRow) => {
    rows.push(r);
    used.add(r.name);
  };
  for (const t of rawTelemetry) {
    const x = pinnedExtras[t.name]!;
    push({
      name: t.name,
      type: x.type,
      environment: t.environment,
      status: t.status,
      cpu: t.cpu,
      ram: t.ram,
      network: t.network,
      idle: x.idle,
      risk: x.risk,
      score: x.score,
    });
  }
  for (const s of pinnedSummary) push(s);
  const random = makeRng(42);
  const pick = <T>(arr: T[]) => arr[Math.floor(random() * arr.length)]!;
  const span = ([a, b]: [number, number]) => a + random() * (b - a);
  const typePool = [
    "CPU",
    "GPU",
    "Storage",
    "Database",
    "Kubernetes",
    "AI workload",
    "VM",
    "Database",
    "GPU",
    "Volume",
    "Backup",
    "Load balancer",
    "Cache",
    "Object storage",
  ];
  const prefixPool = [
    "app",
    "node",
    "worker",
    "etl",
    "cache",
    "queue",
    "batch",
    "edge",
    "api",
    "log",
    "compute",
    "analytics",
    "report",
    "stream",
    "search",
  ];
  const envFor: Record<string, string[]> = {
    IDLE: ["DEV", "TEST", "STAGE"],
    OVERSIZED: ["NON-PROD", "STAGE", "TEST"],
    PROTECTED: ["PROD"],
    ORPHANED: ["ORPHANED"],
    SCHEDULED: ["FLEXIBLE"],
    ACTIVE: ["PROD", "NON-PROD"],
  };
  const nets: Record<string, string[]> = {
    IDLE: ["Near 0", "0"],
    OVERSIZED: ["Low"],
    PROTECTED: ["High", "Medium"],
    ORPHANED: ["0"],
    SCHEDULED: ["Medium"],
    ACTIVE: ["High", "Medium"],
  };
  const ranges: Record<
    string,
    {
      cpu: [number, number];
      ram: [number, number];
      idle: [number, number];
      score: [number, number];
    }
  > = {
    IDLE: { cpu: [0.1, 2], ram: [1, 8], idle: [5, 30], score: [85, 99] },
    OVERSIZED: { cpu: [2, 15], ram: [10, 25], idle: [3, 15], score: [70, 93] },
    PROTECTED: { cpu: [30, 85], ram: [40, 90], idle: [0, 0], score: [20, 60] },
    ORPHANED: { cpu: [0, 0.2], ram: [0, 0], idle: [20, 60], score: [95, 99] },
    SCHEDULED: { cpu: [5, 20], ram: [15, 40], idle: [1, 5], score: [60, 85] },
    ACTIVE: { cpu: [20, 70], ram: [30, 75], idle: [0, 0], score: [10, 50] },
  };
  const riskFor: Record<string, string[]> = {
    IDLE: ["Low", "Low", "Low", "Medium"],
    OVERSIZED: ["Medium", "Medium", "Low"],
    PROTECTED: ["Low", "Medium", "Critical"],
    ORPHANED: ["Low"],
    SCHEDULED: ["Low", "Medium"],
    ACTIVE: ["Low", "Medium"],
  };
  const buckets: Array<[string, number]> = [
    ["IDLE", 40],
    ["OVERSIZED", 61],
    ["PROTECTED", 27],
    ["ORPHANED", 58],
    ["SCHEDULED", 40],
    ["ACTIVE", 259],
  ];
  let n = 100;
  for (const [status, count] of buckets) {
    for (let i = 0; i < count; i++) {
      const env = pick(envFor[status]!);
      let name = "";
      do {
        name = `${pick(prefixPool)}-${env.toLowerCase()}-${n++}`;
      } while (used.has(name));
      const r = ranges[status]!;
      const cpu = span(r.cpu);
      const ram = span(r.ram);
      push({
        name,
        type: pick(typePool),
        environment: env,
        status,
        cpu: `${cpu < 10 ? Math.round(cpu * 10) / 10 : Math.round(cpu)}%`,
        ram: `${Math.round(ram)}%`,
        network: pick(nets[status]!),
        idle: `${Math.round(span(r.idle))}d`,
        risk: pick(riskFor[status]!) as ResourceRow["risk"],
        score: Math.round(span(r.score)),
      });
    }
  }
  return rows;
}
export const allResources: ResourceRow[] = buildAllResources();

export const environmentLabels: Record<string, string> = {
  PROD: "Production",
  DEV: "Development",
  TEST: "Testing",
  STAGE: "Staging",
  "NON-PROD": "Non-prod",
  FLEXIBLE: "Flexible",
  ORPHANED: "Unclassified",
};
export const statusLabels: Record<string, string> = {
  IDLE: "Idle",
  OVERSIZED: "Oversized",
  PROTECTED: "Protected",
  ORPHANED: "Unused",
  SCHEDULED: "Scheduled",
  ACTIVE: "Active",
};
export type ResourceSummaryRow = ResourceRow;
export const resourceSummary: ResourceSummaryRow[] = allResources.map((r) => ({
  ...r,
  environment: environmentLabels[r.environment] ?? r.environment,
  status: statusLabels[r.status] ?? r.status,
}));

export const resourceIntelligenceCategories = [
  "CPU",
  "GPU",
  "Storage",
  "Database",
  "Kubernetes",
  "AI workload",
] as const;
export type ResourceIntelligenceCategory = (typeof resourceIntelligenceCategories)[number];
export type ResourceIntelligenceRow = ResourceSummaryRow & {
  category: ResourceIntelligenceCategory;
  owner: string;
  utilization: number;
  monthlyCost: number;
  carbonImpact: number;
};
// Share of a resource's cost and emissions an AI recommendation removes: idle resources
// stop outside business hours (~60%), oversized ones are rightsized (~45%).
// Production resources are never changed.
export const optimizationRates = { Idle: 0.6, Oversized: 0.45 } as const;
export function getOptimizationRate(resource: { environment: string; status: string }) {
  if (resource.environment === "Production") return 0;
  return resource.status === "Idle" || resource.status === "Oversized"
    ? optimizationRates[resource.status]
    : 0;
}
export function calculateOptimizationProjection(
  resources: readonly Pick<
    ResourceIntelligenceRow,
    "environment" | "status" | "monthlyCost" | "carbonImpact"
  >[],
) {
  const totalCost = resources.reduce((total, resource) => total + resource.monthlyCost, 0);
  const totalCarbon = resources.reduce((total, resource) => total + resource.carbonImpact, 0);
  const potentialSavings = resources.reduce(
    (savings, resource) => {
      const rate = getOptimizationRate(resource);
      return {
        cost: savings.cost + resource.monthlyCost * rate,
        carbon: savings.carbon + resource.carbonImpact * rate,
      };
    },
    { cost: 0, carbon: 0 },
  );
  const reductionPercent = (saving: number, baseline: number) =>
    baseline > 0 ? Math.round((saving / baseline) * 100) : 0;
  const carbonReductionPercent = reductionPercent(potentialSavings.carbon, totalCarbon);
  return {
    costReductionPercent: reductionPercent(potentialSavings.cost, totalCost),
    energyReductionPercent: carbonReductionPercent,
    carbonReductionPercent,
    energyBaselineIndex: 100,
  };
}
function getResourceCategory(resource: ResourceSummaryRow): ResourceIntelligenceCategory {
  if (resource.type === "GPU") return "GPU";
  if (resource.type === "AI workload") return "AI workload";
  if (resource.type === "Kubernetes") return "Kubernetes";
  if (resource.type === "Database") return "Database";
  if (
    resource.type === "Storage" ||
    resource.type === "Volume" ||
    resource.type === "Backup" ||
    resource.type === "Object storage"
  ) {
    return "Storage";
  }
  return "CPU";
}
const categoryCostFactor: Record<ResourceIntelligenceCategory, number> = {
  CPU: 1,
  GPU: 5.2,
  Storage: 0.42,
  Database: 2.6,
  Kubernetes: 1.8,
  "AI workload": 4.4,
};
const categoryCarbonFactor: Record<ResourceIntelligenceCategory, number> = {
  CPU: 0.32,
  GPU: 1.1,
  Storage: 0.12,
  Database: 0.5,
  Kubernetes: 0.42,
  "AI workload": 0.92,
};
const ownerLabels: Record<string, string> = {
  api: "Application platform",
  backup: "Reliability engineering",
  db: "Data platform",
  disk: "Storage platform",
  ml: "AI platform",
  storage: "Storage platform",
  vm: "Platform engineering",
};
// Deterministic 0–1 value per resource name, used to vary provisioned size.
function nameUnit(name: string) {
  let hash = 2166136261;
  for (const character of name) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 10000) / 10000;
}
const intelligenceBase = resourceSummary.map((resource) => {
  const category = getResourceCategory(resource);
  const cpu = Number.parseFloat(resource.cpu) || 0;
  const ram = Number.parseFloat(resource.ram) || 0;
  const utilization = Math.round((cpu + ram) / 2);
  // Cloud bills follow provisioned size, not usage: an idle server costs as much as a busy
  // one, and oversized servers are provisioned at roughly twice what they need.
  const provisionedSize =
    (0.75 + nameUnit(resource.name) * 0.7) * (resource.status === "Oversized" ? 1.9 : 1);
  const costWeight = categoryCostFactor[category] * provisionedSize;
  // Power draw scales with load, with ~35% drawn even when idle.
  const carbonWeight =
    costWeight * categoryCarbonFactor[category] * (0.35 + (0.65 * utilization) / 100);
  const ownerPrefix = resource.name.split("-")[0] ?? "cloud";
  const owner =
    ownerLabels[ownerPrefix] ??
    `${ownerPrefix.charAt(0).toUpperCase()}${ownerPrefix.slice(1)} team`;
  return { ...resource, category, owner, utilization, costWeight, carbonWeight };
});
const totalCostWeight = intelligenceBase.reduce((sum, resource) => sum + resource.costWeight, 0);
const totalCarbonWeight = intelligenceBase.reduce(
  (sum, resource) => sum + resource.carbonWeight,
  0,
);
export const resourceIntelligence: ResourceIntelligenceRow[] = intelligenceBase.map(
  (resource, index) => {
    const { costWeight, carbonWeight, ...row } = resource;
    const monthlyCost =
      index === intelligenceBase.length - 1
        ? Math.round(
            (rawMetrics.monthlyCost -
              intelligenceBase
                .slice(0, -1)
                .reduce(
                  (sum, item) =>
                    sum +
                    Math.round((item.costWeight / totalCostWeight) * rawMetrics.monthlyCost * 100) /
                      100,
                  0,
                )) *
              100,
          ) / 100
        : Math.round((costWeight / totalCostWeight) * rawMetrics.monthlyCost * 100) / 100;
    const totalCarbonKg = rawMetrics.carbonTonnes * 1000;
    const carbonImpact =
      index === intelligenceBase.length - 1
        ? Math.round(
            (totalCarbonKg -
              intelligenceBase
                .slice(0, -1)
                .reduce(
                  (sum, item) =>
                    sum +
                    Math.round((item.carbonWeight / totalCarbonWeight) * totalCarbonKg * 10) / 10,
                  0,
                )) *
              10,
          ) / 10
        : Math.round((carbonWeight / totalCarbonWeight) * totalCarbonKg * 10) / 10;
    return { ...row, monthlyCost, carbonImpact };
  },
);
export const optimizationProjection = calculateOptimizationProjection(resourceIntelligence);
export const resourceCompositionDetails = resourceIntelligenceCategories.map((category) => {
  const categoryResources = resourceIntelligence.filter(
    (resource) => resource.category === category,
  );
  const count = categoryResources.length;
  return {
    category,
    count,
    utilization: count
      ? Math.round(
          categoryResources.reduce((sum, resource) => sum + resource.utilization, 0) / count,
        )
      : 0,
    carbonImpact:
      Math.round(categoryResources.reduce((sum, resource) => sum + resource.carbonImpact, 0) * 10) /
      10,
    monthlyCost: Math.round(
      categoryResources.reduce((sum, resource) => sum + resource.monthlyCost, 0),
    ),
  };
});

const idleDays = (resource: ResourceIntelligenceRow) => Number.parseInt(resource.idle, 10) || 0;
function summarizeServers(rows: readonly ResourceIntelligenceRow[]) {
  const count = rows.length;
  const average = (value: (resource: ResourceIntelligenceRow) => number) =>
    count ? Math.round(rows.reduce((sum, resource) => sum + value(resource), 0) / count) : 0;
  return {
    count,
    monthlyCost: Math.round(rows.reduce((sum, resource) => sum + resource.monthlyCost, 0)),
    carbonKg: Math.round(rows.reduce((sum, resource) => sum + resource.carbonImpact, 0)),
    averageUtilization: average((resource) => resource.utilization),
    averageIdleDays: average(idleDays),
    potentialSaving: Math.round(
      rows.reduce((sum, resource) => sum + resource.monthlyCost * getOptimizationRate(resource), 0),
    ),
  };
}
const byStatus = (status: string) =>
  resourceIntelligence.filter((resource) => resource.status === status);
const carbonRanked = [...resourceIntelligence].sort(
  (left, right) => right.carbonImpact - left.carbonImpact,
);
const fleetCarbonKg = resourceIntelligence.reduce(
  (sum, resource) => sum + resource.carbonImpact,
  0,
);
export const serverInsightGroups = {
  idle: summarizeServers(byStatus("Idle")),
  oversized: summarizeServers(byStatus("Oversized")),
  unused: summarizeServers(byStatus("Unused")),
  protected: summarizeServers(byStatus("Protected")),
  hotspots: {
    ...summarizeServers(carbonRanked.slice(0, 10)),
    sharePercent: Math.round(
      (carbonRanked.slice(0, 10).reduce((sum, resource) => sum + resource.carbonImpact, 0) /
        fleetCarbonKg) *
        100,
    ),
  },
};

export type ServerInsight = {
  headline: string;
  detail: string;
  action: string;
  tone: "primary" | "warn" | "info" | "danger" | "muted";
  /** ₹ per month this server's recommended action would save. */
  savingInr: number;
  carbonRank: number;
};
// Plain-language insight for one server, based on its status and telemetry.
export function getServerInsight(resource: ResourceIntelligenceRow): ServerInsight {
  const carbonRank = carbonRanked.findIndex((item) => item.name === resource.name) + 1;
  const days = idleDays(resource);
  switch (resource.status) {
    case "Idle":
      return {
        headline: "Idle — stop it outside business hours",
        detail: `CPU ${resource.cpu} and RAM ${resource.ram} with no real load for ${days} days.`,
        action: "Schedule it to stop at night and on weekends.",
        tone: "primary",
        savingInr: Math.round(resource.monthlyCost * getOptimizationRate(resource)),
        carbonRank,
      };
    case "Oversized":
      return {
        headline: "Oversized — move it to a smaller size",
        detail: `It uses only ${resource.utilization}% of the capacity it pays for.`,
        action: "Rightsize to roughly half the current size.",
        tone: "warn",
        savingInr: Math.round(resource.monthlyCost * getOptimizationRate(resource)),
        carbonRank,
      };
    case "Unused":
      return {
        headline: "Unused — delete after an owner check",
        detail: `Not attached to any running workload for ${days} days.`,
        action: "Confirm the owner, keep a snapshot, then delete it.",
        tone: "danger",
        savingInr: Math.round(resource.monthlyCost),
        carbonRank,
      };
    case "Protected":
      return {
        headline: "Protected production — no automatic changes",
        detail: `Serving production traffic at ${resource.utilization}% utilization.`,
        action: "CurbPilot only reports on it; changes need a manual ticket.",
        tone: "info",
        savingInr: 0,
        carbonRank,
      };
    case "Scheduled":
      return {
        headline: "Flexible — runs on a schedule",
        detail: `Batch workload at ${resource.utilization}% average utilization.`,
        action: "Keep its run window in low-carbon hours.",
        tone: "info",
        savingInr: 0,
        carbonRank,
      };
    default:
      return {
        headline: "Healthy — no action needed",
        detail: `Utilization of ${resource.utilization}% is within the normal range.`,
        action: "Keep monitoring.",
        tone: "muted",
        savingInr: 0,
        carbonRank,
      };
  }
}

export function filterResourceSummary(query: string, environment: string, status: string) {
  return resourceSummary.filter(
    (r) =>
      r.name.toLowerCase().includes(query.trim().toLowerCase()) &&
      (environment === "All" || r.environment === environment) &&
      (status === "All" || r.status === status),
  );
}

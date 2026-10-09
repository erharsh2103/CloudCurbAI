export type Res = {
  id: string;
  name: string;
  type: string;
  region: string;
  category: string;
  waste: number;
  /** kg CO₂e per month */
  carbon: number;
  /** ₹ per month */
  cost: number;
  risk: "Low" | "Medium" | "High";
  confidence: number;
  action: string;
  why: string;
  /** Set when the recommended action moves the workload to another region. */
  targetRegion?: string;
};

export const resources: Res[] = [
  {
    id: "r1",
    name: "ml-train-a100-07",
    type: "p4d.24xlarge",
    region: "us-east-1",
    category: "AI/GPU underutilized",
    waste: 87,
    carbon: 824,
    cost: 554_400,
    risk: "Medium",
    confidence: 94,
    action: "Move GPU training window from 4:00 PM to 4:00 AM",
    why: "GPU utilization averaged 18% over 14 days with bursts only during nightly batch jobs.",
  },
  {
    id: "r2",
    name: "api-staging-cluster",
    type: "m5.4xlarge ×6",
    region: "eu-west-1",
    category: "Idle",
    waste: 92,
    carbon: 192,
    cost: 126_000,
    risk: "Low",
    confidence: 98,
    action: "Stop outside business hours",
    why: "Zero inbound requests from 19:00–08:00 and weekends for 30 days.",
  },
  {
    id: "r3",
    name: "analytics-db-replica",
    type: "r6g.8xlarge",
    region: "us-west-2",
    category: "Oversized",
    waste: 71,
    carbon: 276,
    cost: 183_600,
    risk: "Medium",
    confidence: 89,
    action: "Rightsize to r6g.2xlarge",
    why: "Peak memory 22% of provisioned, CPU p95 at 14%.",
  },
  {
    id: "r4",
    name: "vol-0a9f3e-snapshot",
    type: "EBS gp3 2TB",
    region: "ap-south-1",
    category: "Unused",
    waste: 100,
    carbon: 42,
    cost: 29_400,
    risk: "Low",
    confidence: 99,
    action: "Delete unattached volume",
    why: "Detached for 63 days. No AMI or instance references.",
  },
  {
    id: "r5",
    name: "inference-h100-pool",
    type: "p5.48xlarge ×2",
    region: "ap-southeast-1",
    category: "High carbon",
    waste: 64,
    carbon: 1176,
    cost: 684_000,
    risk: "High",
    confidence: 81,
    action: "Migrate to eu-north-1 (hydro)",
    why: "Grid intensity 520 gCO₂/kWh vs 28 gCO₂/kWh in Stockholm with equivalent latency for 70% of traffic.",
    targetRegion: "eu-north-1",
  },
  {
    id: "r6",
    name: "legacy-etl-worker",
    type: "c5.9xlarge",
    region: "us-east-1",
    category: "Idle",
    waste: 83,
    carbon: 148,
    cost: 86_400,
    risk: "Low",
    confidence: 95,
    action: "Convert to scheduled Spot job",
    why: "Runs 40 minutes daily but stays provisioned 24/7.",
  },
  {
    id: "r7",
    name: "lb-old-marketing",
    type: "ALB",
    region: "eu-central-1",
    category: "Unused",
    waste: 100,
    carbon: 16,
    cost: 12_240,
    risk: "Low",
    confidence: 97,
    action: "Remove load balancer",
    why: "No healthy targets for 41 days.",
  },
  {
    id: "r8",
    name: "vector-search-nodes",
    type: "r5.12xlarge ×3",
    region: "us-east-1",
    category: "Oversized",
    waste: 58,
    carbon: 406,
    cost: 280_800,
    risk: "High",
    confidence: 76,
    action: "Rightsize + enable autoscaling",
    why: "Memory headroom 61%, but traffic is spiky — risk of latency regression.",
  },
  {
    id: "r9",
    name: "llm-inference-batch",
    type: "g5.12xlarge ×4",
    region: "us-west-2",
    category: "Inefficient AI workload",
    waste: 79,
    carbon: 712,
    cost: 438_000,
    risk: "Medium",
    confidence: 88,
    action: "Shift batch inference from 9:00 PM to 3:00 AM low-carbon window",
    why: "Simulated inference traces show low batch density and sustained GPU memory headroom during peak traffic.",
  },
  {
    id: "r10",
    name: "nightly-forecast-worker",
    type: "c7i.4xlarge ×8",
    region: "eu-west-1",
    category: "Scheduling opportunity",
    waste: 73,
    carbon: 328,
    cost: 175_200,
    risk: "Low",
    confidence: 93,
    action: "Shift forecast workers from 5:00 PM to 1:00 AM low-carbon window",
    why: "The simulated job runs for 3.5 hours nightly while its worker pool remains provisioned outside the processing window.",
  },
];

export const categories = [
  "Idle",
  "Oversized",
  "Unused",
  "AI/GPU underutilized",
  "High carbon",
  "Inefficient AI workload",
  "Scheduling opportunity",
];

export function isCurbPilotEligible(resource: Pick<Res, "risk">) {
  return resource.risk !== "High";
}

/** Grid emission factor used to convert between energy and CO₂e. */
export const CARBON_KG_PER_KWH = 0.35;

// What each kind of action removes: deleting an unused resource removes all of it,
// stopping an idle one outside business hours removes ~60%, rightsizing ~45%.
const categoryReductionRate: Partial<Record<string, number>> = {
  Unused: 1,
  Idle: 0.6,
  Oversized: 0.45,
};

function getReductionRates(resource: Pick<Res, "waste" | "category" | "region" | "targetRegion">) {
  if (resource.targetRegion) {
    const source = regions.find((region) => region.region === resource.region);
    const target = regions.find((region) => region.region === resource.targetRegion);
    if (source && target) {
      return {
        cost: Math.max(0, 1 - target.cost / source.cost),
        carbon: Math.max(0, 1 - target.g / source.g),
      };
    }
  }
  const rate =
    categoryReductionRate[resource.category] ?? Math.min(0.4, Math.max(0.15, resource.waste / 250));
  return { cost: rate, carbon: rate };
}

export function getOpportunityProjection(
  resource: Pick<Res, "waste" | "cost" | "carbon" | "category" | "region" | "targetRegion">,
) {
  const rates = getReductionRates(resource);
  const costSaving = Math.round(resource.cost * rates.cost);
  const carbonReduction = Math.round(resource.carbon * rates.carbon);
  const energySavingKwh = Math.round(carbonReduction / CARBON_KG_PER_KWH);
  const beforeEnergyKwh = Math.round(resource.carbon / CARBON_KG_PER_KWH);

  return {
    costReductionRate: rates.cost,
    carbonReductionRate: rates.carbon,
    costSaving,
    carbonReduction,
    energySavingKwh,
    afterCost: resource.cost - costSaving,
    afterCarbon: resource.carbon - carbonReduction,
    afterEnergyKwh: Math.max(0, beforeEnergyKwh - energySavingKwh),
    beforeEnergyKwh,
  };
}

export const telemetry = (seed: number) =>
  Array.from({ length: 24 }, (_, h) => ({
    h: `${h}:00`,
    cpu: Math.round(15 + 10 * Math.sin((h + seed) / 3) + (h % 5)),
    gpu: Math.round(18 + 30 * Math.max(0, Math.sin((h - 2 + seed) / 4))),
    ram: Math.round(30 + 8 * Math.cos(h / 5)),
    net: Math.round(20 + 15 * Math.sin(h / 2 + seed)),
  }));

export const carbonTimeline = Array.from({ length: 24 }, (_, h) => {
  const solar = Math.max(0, Math.sin(((h - 6) / 12) * Math.PI));
  return {
    h: `${h}:00`,
    intensity: Math.round(420 - 230 * solar + 30 * Math.sin(h)),
    renewable: Math.round(28 + 52 * solar),
    forecast: Math.round(400 - 210 * solar + 20 * Math.cos(h)),
  };
});

export const regions = [
  { region: "eu-north-1", name: "Stockholm", g: 28, cost: 1.0, latency: 92 },
  { region: "ca-central-1", name: "Montreal", g: 34, cost: 0.97, latency: 41 },
  { region: "eu-west-1", name: "Ireland", g: 296, cost: 1.02, latency: 78 },
  { region: "us-west-2", name: "Oregon", g: 118, cost: 0.95, latency: 22 },
  { region: "us-east-1", name: "Virginia", g: 379, cost: 0.92, latency: 12 },
  { region: "ap-southeast-1", name: "Singapore", g: 520, cost: 1.08, latency: 180 },
];

// Monthly fleet totals: cost in ₹, CO₂e in tonnes. October is the current month and
// matches the fleet totals (₹1.86 Cr, 48.6 t). Values ease down as optimizations add up,
// with small seasonal bumps (January restart, July peak).
export const monthly = [
  { m: "Nov", cost: 23_150_000, co2: 61.1 },
  { m: "Dec", cost: 22_780_000, co2: 60.0 },
  { m: "Jan", cost: 22_950_000, co2: 60.6 },
  { m: "Feb", cost: 22_360_000, co2: 59.0 },
  { m: "Mar", cost: 21_960_000, co2: 58.0 },
  { m: "Apr", cost: 21_380_000, co2: 56.4 },
  { m: "May", cost: 20_920_000, co2: 55.1 },
  { m: "Jun", cost: 20_350_000, co2: 53.7 },
  { m: "Jul", cost: 20_520_000, co2: 54.3 },
  { m: "Aug", cost: 19_730_000, co2: 52.1 },
  { m: "Sep", cost: 19_240_000, co2: 50.8 },
  { m: "Oct", cost: 18_600_000, co2: 48.6 },
];

export type ChangeFeedback = "Good" | "Bad";
export type Action = {
  id: string;
  title: string;
  target: string;
  risk: "Low" | "Medium" | "High";
  status: string;
  /** Display label for the expected monthly impact, e.g. "₹6,300/mo · 58 kg CO₂e/mo". */
  saving: string;
  progress?: number | undefined;
  failureReason?: string | undefined;
  /** ₹ per month */
  costSavingInr?: number | undefined;
  carbonSavingKg?: number | undefined;
  energySavingKwh?: number | undefined;
  /** ₹ per month */
  expectedCostSavingInr?: number | undefined;
  expectedCarbonSavingKg?: number | undefined;
  expectedEnergySavingKwh?: number | undefined;
  outcome?: "Successful" | "Partially successful" | "Unsuccessful" | undefined;
  slaResult?: string | undefined;
  decisionAccuracyPct?: number | undefined;
  learningStatus?: "Ready" | "Learning" | "Learned" | undefined;
  learningNote?: string | undefined;
  /** The user's post-change audit rating. */
  feedback?: ChangeFeedback | undefined;
  feedbackAt?: string | undefined;
  history?: ActionHistoryEvent[] | undefined;
  executionStartedAt?: string | undefined;
  executionTimeMs?: number | undefined;
  explanation?: string | undefined;
  confidence?: number | undefined;
};
export type ActionHistoryEvent = {
  at: string;
  actor: string;
  event: string;
  details: string;
};
export type ActionSeed = Pick<Action, "id" | "title" | "target" | "risk" | "status">;
// Expected savings are calculated from each target's opportunity projection.
export const initialActions: ActionSeed[] = [
  {
    id: "a1",
    title: "Stop idle staging cluster nightly",
    target: "api-staging-cluster",
    risk: "Low",
    status: "Queued",
  },
  {
    id: "a2",
    title: "Delete unused EBS volume",
    target: "vol-0a9f3e-snapshot",
    risk: "Low",
    status: "Queued",
  },
  {
    id: "a3",
    title: "Remove dangling load balancer",
    target: "lb-old-marketing",
    risk: "Low",
    status: "Queued",
  },
  {
    id: "a4",
    title: "Rightsize analytics replica",
    target: "analytics-db-replica",
    risk: "Medium",
    status: "Awaiting approval",
  },
  {
    id: "a5",
    title: "Move GPU training window from 4:00 PM to 4:00 AM",
    target: "ml-train-a100-07",
    risk: "Medium",
    status: "Awaiting approval",
  },
  {
    id: "a6",
    title: "Migrate inference pool to eu-north-1",
    target: "inference-h100-pool",
    risk: "High",
    status: "Blocked",
  },
  {
    id: "a7",
    title: "Shrink vector-search memory",
    target: "vector-search-nodes",
    risk: "High",
    status: "Blocked",
  },
];

export const audit = [
  {
    t: "Oct 07 09:12",
    who: "CurbPilot",
    msg: "Auto-stopped dev-sandbox-14 (idle 72h)",
    tag: "Executed",
  },
  {
    t: "Oct 07 08:40",
    who: "P. Shah",
    msg: "Approved rightsizing of billing-worker-03",
    tag: "Approved",
  },
  {
    t: "Oct 06 22:05",
    who: "CurbBrain",
    msg: "Shifted batch-embeddings job to 02:00 low-carbon window",
    tag: "Executed",
  },
  {
    t: "Oct 06 17:30",
    who: "CurbPilot",
    msg: "Blocked migration of payments-db (SLA policy)",
    tag: "Blocked",
  },
  {
    t: "Oct 06 11:18",
    who: "A. Rao",
    msg: "Rejected deletion of archive-bucket-legacy",
    tag: "Rejected",
  },
  {
    t: "Oct 05 14:02",
    who: "CurbPilot",
    msg: "Deleted 14 unused snapshots (3.2 TB)",
    tag: "Executed",
  },
];

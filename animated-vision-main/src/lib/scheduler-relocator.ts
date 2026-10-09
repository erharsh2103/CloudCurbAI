import { getOpportunityProjection, regions, resources, type Res } from "@/lib/data";

const scheduleWindows = [
  {
    resourceId: "r1",
    currentSchedule: "4:00 PM",
    recommendedSchedule: "4:00 AM",
    reason: "Move the GPU training run into the overnight low-carbon window.",
  },
  {
    resourceId: "r9",
    currentSchedule: "9:00 PM",
    recommendedSchedule: "3:00 AM",
    reason: "Shift batch inference into a lower-carbon overnight window.",
  },
  {
    resourceId: "r10",
    currentSchedule: "5:00 PM",
    recommendedSchedule: "1:00 AM",
    reason: "Run the forecast worker during the overnight low-carbon window.",
  },
] as const;

function requireResource(resourceId: string): Res {
  const resource = resources.find((item) => item.id === resourceId);
  if (!resource)
    throw new Error(`Scheduler recommendation references missing resource: ${resourceId}`);
  return resource;
}

export const scheduleRecommendations = scheduleWindows.map((window) => {
  const resource = requireResource(window.resourceId);
  const impact = getOpportunityProjection(resource);
  return {
    ...window,
    resource,
    expectedCarbonReductionKg: impact.carbonReduction,
    expectedCarbonReductionPercent: Math.round(impact.carbonReductionRate * 100),
    expectedCostReductionInr: impact.costSaving,
    expectedCostReductionPercent: Math.round(impact.costReductionRate * 100),
  };
});

const relocationPlan = {
  resourceId: "r5",
  sourceGroup: "Group 1",
  sourceServer: "Server 23",
  targetGroup: "Group 45",
  targetRegion: "eu-north-1",
  reason: "Hydro-powered region with lower grid intensity and equivalent latency for most traffic.",
};

const relocatableResource = requireResource(relocationPlan.resourceId);
const sourceRegion = regions.find((region) => region.region === relocatableResource.region);
const targetRegion = regions.find((region) => region.region === relocationPlan.targetRegion);

if (!sourceRegion || !targetRegion || targetRegion.g >= sourceRegion.g) {
  throw new Error(
    "Relocation recommendation must have valid regions and lower target carbon intensity.",
  );
}

const relocationCarbonReductionPercent = ((sourceRegion.g - targetRegion.g) / sourceRegion.g) * 100;
const relocationCostReductionPercent =
  ((sourceRegion.cost - targetRegion.cost) / sourceRegion.cost) * 100;

export const relocationRecommendation = {
  ...relocationPlan,
  resource: relocatableResource,
  sourceRegion,
  target: targetRegion,
  carbonIntensityReductionPercent: Math.round(relocationCarbonReductionPercent * 10) / 10,
  expectedCarbonReductionKg: Math.round(
    (relocatableResource.carbon * relocationCarbonReductionPercent) / 100,
  ),
  estimatedCostChangePercent: Math.round(relocationCostReductionPercent * 10) / 10,
};

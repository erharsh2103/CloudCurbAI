import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Pause, Play, RotateCcw, Layers3, ArrowUpRight, Box, ChevronDown } from "lucide-react";
import { SceneView } from "./scene-view";
import { Button } from "@/components/ui/button";
import { resources } from "@/lib/data";
import { Bar, Risk } from "./ui-kit";

export function InfrastructureView() {
  const [selected, setSelected] = useState("r1");
  const [paused, setPaused] = useState(false);
  const [exploded, setExploded] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const resource = resources.find((r) => r.id === selected) ?? resources[0];
  if (!resource) return null;
  return (
    <section aria-label="3D infrastructure" className="infra-layout">
      <div className="infra-stage">
        <div className="infra-toolbar">
          <div className="flex items-center gap-2">
            <Box size={15} className="text-primary" />
            <span className="text-xs font-semibold">Infrastructure topology</span>
            <span className="hidden text-xs text-muted-foreground lg:inline">
              8 flagged resources
            </span>
          </div>
          <div className="flex gap-1">
            <Button
              variant="secondary"
              size="icon"
              title={paused ? "Resume rotation" : "Pause rotation"}
              aria-label={paused ? "Resume rotation" : "Pause rotation"}
              onClick={() => setPaused(!paused)}
            >
              {paused ? <Play /> : <Pause />}
            </Button>
            <Button
              variant={exploded ? "default" : "secondary"}
              size="icon"
              title="Explode topology"
              aria-label="Explode topology"
              aria-pressed={exploded}
              onClick={() => setExploded(!exploded)}
            >
              <Layers3 />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              title="Reset camera"
              aria-label="Reset camera"
              onClick={() => setResetKey((k) => k + 1)}
            >
              <RotateCcw />
            </Button>
          </div>
        </div>
        <SceneView
          selected={selected}
          onSelect={setSelected}
          paused={paused}
          exploded={exploded}
          resetKey={resetKey}
        />
        <div className="infra-label">
          <div className="mb-2 flex items-center gap-2 text-xs">
            <span className="status-dot" />
            AWS · Azure · GCP
          </div>
          <div className="font-mono text-xs text-muted-foreground">RESOURCE GRAPH / SIMULATED</div>
        </div>
      </div>
      <aside className="infra-detail">
        <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>Selected resource</span>
          <ChevronDown size={14} />
        </div>
        <select
          aria-label="Select resource"
          className="mb-4 w-full rounded-md border bg-muted p-2 font-mono text-xs"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          {resources.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <div className="flex items-center justify-between">
          <div className="metric-gauge">
            <span className="font-mono text-xl">
              {resource.waste}
              <span className="text-xs text-muted-foreground">/100</span>
            </span>
          </div>
          <div className="text-right">
            <Risk r={resource.risk} />
            <div className="mt-2 text-xs text-muted-foreground">Waste score</div>
          </div>
        </div>
        <dl className="my-5 space-y-3 text-xs">
          {[
            ["Region", resource.region],
            ["Monthly cost", `₹${resource.cost.toLocaleString("en-IN")}`],
            ["Carbon", `${resource.carbon} kgCO₂e`],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-2">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-mono">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mb-2 flex justify-between text-xs">
          <span className="text-muted-foreground">AI confidence</span>
          <span className="text-primary">{resource.confidence}%</span>
        </div>
        <Bar v={resource.confidence} />
        <p className="mt-5 text-xs leading-relaxed text-muted-foreground">{resource.action}</p>
        <Button asChild size="sm" className="mt-4 w-full">
          <Link to="/resource" search={{ id: resource.id }}>
            Inspect resource <ArrowUpRight />
          </Link>
        </Button>
      </aside>
    </section>
  );
}

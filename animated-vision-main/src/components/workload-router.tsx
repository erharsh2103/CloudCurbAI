import { useState } from "react";
import { Check, Clock, MapPin, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui-kit";

export function WorkloadRouter() {
  const [routed, setRouted] = useState(false);
  return (
    <Card title="Carbon-Aware AI Workload Router">
      <div className="grid gap-3 md:grid-cols-3">
        {[
          { icon: Clock, label: "When", answer: "11:00–15:00 IST", detail: "Solar peak" },
          { icon: MapPin, label: "Where", answer: "eu-north-1", detail: "Hydro · 28 gCO₂/kWh" },
          {
            icon: Settings2,
            label: "How",
            answer: "4× A100 Spot",
            detail: "Checkpointed · 62% cheaper",
          },
        ].map((x) => (
          <div key={x.label} className="border-b py-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <x.icon size={14} />
              {x.label}
            </div>
            <div className="mt-3 font-mono text-sm text-primary">{x.answer}</div>
            <div className="mt-2 text-xs text-muted-foreground">{x.detail}</div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">Projected −91% CO₂e · simulated</span>
        <Button size="sm" disabled={routed} onClick={() => setRouted(true)}>
          {routed ? (
            <>
              <Check />
              Routed
            </>
          ) : (
            "Route workload"
          )}
        </Button>
      </div>
    </Card>
  );
}

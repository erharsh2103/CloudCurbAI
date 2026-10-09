import { Button } from "@/components/ui/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Page, Risk, Bar } from "@/components/ui-kit";
import { resources, categories, getOpportunityProjection, isCurbPilotEligible } from "@/lib/data";
import { formatInr, formatNumber } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowRight, ArrowUpRight, Bot, Check, Leaf, Send, Sparkles, Zap } from "lucide-react";

export const Route = createFileRoute("/opportunities")({
  head: () => ({
    meta: [
      { title: "AI Action Plan — CloudCurb AI" },
      {
        name: "description",
        content:
          "Review simulated AI recommendations for cloud cost, carbon, utilization and workload scheduling.",
      },
      { property: "og:title", content: "AI Action Plan — CloudCurb AI" },
      {
        property: "og:description",
        content:
          "Review CurbBrain analysis, impact estimates and actionable cloud recommendations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Opps,
});

function Opps() {
  const [cat, setCat] = useState("All");
  const [sent, setSent] = useState<string[]>([]);
  const list = resources.filter((r) => cat === "All" || r.category === cat);
  return (
    <Page title="AI Action Plan">
      <section className="opportunity-intro">
        <div className="opportunity-intro-icon">
          <Bot size={20} />
        </div>
        <div>
          <strong>Recommended actions, ranked by impact</strong>
          <p>
            CurbBrain found {list.length} recommendations from simulated waste, cost, carbon and
            policy signals. Review the projected impact, then send eligible actions to CurbPilot for
            approval. No live cloud changes are made.
          </p>
        </div>
      </section>
      <div className="opportunity-filters" aria-label="Filter recommendations by type">
        {["All", ...categories].map((c) => (
          <Button
            key={c}
            onClick={() => setCat(c)}
            variant={cat === c ? "default" : "outline"}
            aria-pressed={cat === c}
          >
            {c}
          </Button>
        ))}
      </div>
      <div className="opportunity-grid">
        {list.map((r) => {
          const eligible = isCurbPilotEligible(r);
          const hasSent = sent.includes(r.id);
          const projection = getOpportunityProjection(r);
          return (
            <article key={r.id} className="glass opportunity-card">
              <div className="opportunity-card-heading">
                <div className="min-w-0">
                  <h2>{r.name}</h2>
                  <p>
                    {r.type} · {r.region}
                  </p>
                </div>
                <span className="opportunity-category">{r.category}</span>
              </div>
              <div className="opportunity-waste">
                <div>
                  <span>Waste Score</span>
                  <strong>
                    {r.waste}
                    <small>/100</small>
                  </strong>
                </div>
                <Bar v={r.waste} cls={r.waste > 80 ? "bg-danger" : "bg-warn"} />
              </div>
              <dl className="opportunity-metrics">
                <div>
                  <dt>Carbon Impact</dt>
                  <dd>{formatNumber(r.carbon)} kg CO₂e/mo</dd>
                </div>
                <div>
                  <dt>Cost Impact</dt>
                  <dd>{formatInr(r.cost)}/mo</dd>
                </div>
                <div>
                  <dt>Risk</dt>
                  <dd>
                    <Risk r={r.risk} />
                  </dd>
                </div>
                <div>
                  <dt>Confidence</dt>
                  <dd className="opportunity-confidence">{r.confidence}%</dd>
                </div>
              </dl>
              <section className="opportunity-explanation">
                <h3>AI explanation</h3>
                <p>{r.why}</p>
              </section>
              <section className="opportunity-action">
                <h3>Recommended action</h3>
                <p>{r.action}</p>
              </section>
              <div className="opportunity-card-actions">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Sparkles /> Review recommendation
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="opportunity-recommendation-dialog">
                    <DialogHeader className="opportunity-dialog-header">
                      <span className="opportunity-dialog-eyebrow">
                        <Bot size={14} /> SIMULATED AI RECOMMENDATION
                      </span>
                      <DialogTitle>{r.name}</DialogTitle>
                      <DialogDescription>
                        Projected resource optimization · {r.type} · {r.region}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="opportunity-before-after">
                      <section className="opportunity-state opportunity-state-before">
                        <span className="opportunity-state-label">BEFORE</span>
                        <strong>Current state</strong>
                        <span>{formatInr(r.cost)}/mo estimated cost</span>
                        <span>{formatNumber(r.carbon)} kg CO₂e/mo</span>
                        <span>
                          {formatNumber(projection.beforeEnergyKwh)} kWh/mo estimated energy
                        </span>
                        <span>Waste score {r.waste}/100</span>
                      </section>
                      <div className="opportunity-optimization-step" aria-label="AI optimization">
                        <span>AI RECOMMENDATION</span>
                        <ArrowRight size={17} />
                        <span className="opportunity-optimization-change">{r.action}</span>
                      </div>
                      <section className="opportunity-state opportunity-state-after">
                        <span className="opportunity-state-label">AFTER</span>
                        <strong>Projected state</strong>
                        <span>{formatInr(projection.afterCost)}/mo estimated cost</span>
                        <span>{formatNumber(projection.afterCarbon)} kg CO₂e/mo</span>
                        <span>
                          {formatNumber(projection.afterEnergyKwh)} kWh/mo estimated energy
                        </span>
                        <span>
                          {Math.round(r.waste * (1 - projection.costReductionRate))}/100 projected
                          waste score
                        </span>
                      </section>
                    </div>
                    <section
                      className="opportunity-projected-savings"
                      aria-label="Expected savings"
                    >
                      <div>
                        <span>
                          <span className="sr-only">Expected </span>Cost saving
                        </span>
                        <strong>
                          {formatInr(projection.costSaving)}
                          <small>/mo</small>
                        </strong>
                      </div>
                      <div>
                        <span>
                          <Zap size={13} /> Energy saving
                        </span>
                        <strong>
                          {formatNumber(projection.energySavingKwh)}
                          <small> kWh/mo</small>
                        </strong>
                      </div>
                      <div>
                        <span>
                          <Leaf size={13} /> CO₂ reduction
                        </span>
                        <strong>
                          {formatNumber(projection.carbonReduction)}
                          <small> kg/mo</small>
                        </strong>
                      </div>
                    </section>
                    <div className="opportunity-ai-details">
                      <section>
                        <h3>AI analysis</h3>
                        <p>
                          CurbBrain assigns a {r.waste}/100 waste score and estimates a{" "}
                          {Math.round(projection.costReductionRate * 100)}% cost and{" "}
                          {Math.round(projection.carbonReductionRate * 100)}% CO₂e reduction based
                          on the utilization and workload signals for this resource.
                        </p>
                      </section>
                      <section>
                        <h3>Why this resource is inefficient</h3>
                        <p>{r.why}</p>
                      </section>
                      <div className="opportunity-dialog-assurance">
                        <span>
                          Risk <Risk r={r.risk} />
                        </span>
                        <span>
                          AI confidence <strong>{r.confidence}%</strong>
                        </span>
                      </div>
                    </div>
                    <p className="opportunity-projection-note">
                      All values are monthly estimates, not guaranteed savings. Energy is estimated
                      from CO₂e using a 0.35 kg CO₂e/kWh grid factor. Actual results depend on
                      workload and approval.
                    </p>
                  </DialogContent>
                </Dialog>
                <Button asChild size="sm" variant="outline">
                  <Link to="/resource" search={{ id: r.id }}>
                    Resource details <ArrowUpRight />
                  </Link>
                </Button>
                {eligible ? (
                  <Button asChild size="sm" disabled={hasSent}>
                    <Link
                      to="/pilot"
                      search={{ opportunity: r.id }}
                      onClick={() => setSent((current) => [...current, r.id])}
                      aria-label={`Send ${r.name} opportunity to CurbPilot`}
                    >
                      {hasSent ? (
                        <>
                          <Check /> Sent to CurbPilot
                        </>
                      ) : (
                        <>
                          <Send /> Send to CurbPilot <ArrowRight />
                        </>
                      )}
                    </Link>
                  </Button>
                ) : (
                  <span
                    className="opportunity-policy-note"
                    title="High-risk actions require a manual review"
                  >
                    High risk · manual review required
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </Page>
  );
}

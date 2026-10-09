import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, ShieldCheck, Cpu, Bot, MoveDown } from "lucide-react";
import { BrandLogo, BrandMark } from "@/components/brand-logo";
import { SceneView } from "@/components/scene-view";
import { Button } from "@/components/ui/button";
import { formatInrCompact } from "@/lib/format";
import { optimizationProjection, rawMetrics } from "@/lib/raw-cloud";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CloudCurb AI" },
      {
        name: "description",
        content:
          "Turn cloud waste into measurable impact. Explore autonomous carbon-aware optimization, resource intelligence, and protected production.",
      },
      { property: "og:title", content: "CloudCurb AI" },
      {
        property: "og:description",
        content: "Cloud cost and carbon intelligence with protected production.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});
function Brand() {
  return (
    <Link to="/" className="brand-mark" aria-label="CloudCurb AI home">
      <BrandLogo size={40} />
    </Link>
  );
}
function Landing() {
  return (
    <div>
      <header className="site-header">
        <Brand />
        <nav className="site-nav">
          <a href="#platform">Platform</a>
          <a href="#intelligence">Intelligence</a>
          <a href="#impact">Impact</a>
        </nav>
        <Button asChild variant="outline" size="sm">
          <Link to="/dashboard">
            Open workspace <ArrowUpRight />
          </Link>
        </Button>
      </header>
      <section className="hero-stage" aria-label="CloudCurb AI">
        <div className="hero-scene" aria-label="Animated three-dimensional cloud infrastructure">
          <SceneView landing selected="r1" />
        </div>
        <div className="hero-content">
          <BrandMark size={112} className="hero-logo reveal" />
          <h1 className="reveal">
            CloudCurb <span className="brand-logo-ai">AI</span>
          </h1>
          <p className="reveal reveal-delay">
            Turn invisible cloud waste into measurable impact. Optimize cost, energy, and carbon —
            while keeping your production protected.
          </p>
          <div className="hero-actions reveal reveal-delay">
            <Button asChild size="lg">
              <Link to="/dashboard">
                Explore the platform <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
        <div className="hero-footer">
          <div className="hero-live">
            <span className="status-dot" />
            AWS / AZURE / GCP / KUBERNETES
          </div>
          <a href="#platform" aria-label="Discover the platform">
            <MoveDown size={20} />
          </a>
        </div>
      </section>
      <section id="impact" className="border-b">
        <div className="stats-band">
          {[
            [String(rawMetrics.resources), "Cloud resources monitored"],
            [formatInrCompact(rawMetrics.monthlyCost), "Monthly cloud spend"],
            [`${rawMetrics.carbonTonnes} t`, "Monthly CO₂e emissions"],
            [`−${optimizationProjection.costReductionPercent}%`, "Projected spend with AI"],
            [`${rawMetrics.productionProtected}%`, "Production protected"],
          ].map(([v, l]) => (
            <div key={l}>
              <strong>{v}</strong>
              <p>{l}</p>
            </div>
          ))}
        </div>
      </section>
      <section id="platform" className="section-shell">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h2 className="section-heading">How CloudCurb AI works</h2>
          <p className="section-description">
            A continuous intelligence loop that finds waste, understands its impact, and acts only
            when it’s safe.
          </p>
        </div>
        <div className="process-grid">
          {[
            ["Detect", "Spot idle, oversized, and unused resources."],
            ["Understand", "Rank waste with context and confidence."],
            ["CarbonLens", "Measure the energy and emissions behind every workload."],
            ["Policy Gate", "Protect production. Approve the right changes."],
            ["Verify", "Close the loop with measurable, auditable results."],
          ].map(([t, d], i) => (
            <div className="process-item" key={t}>
              <span className="process-number">0{i + 1} /</span>
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
          ))}
        </div>
      </section>
      <section id="intelligence" className="border-y bg-card">
        <div className="section-shell feature-layout">
          <div>
            <h2 className="section-heading">Inside the workspace</h2>
            <p className="section-description">
              Resource intelligence, safe automation and a verifiable audit trail for cost and
              carbon in one place.
            </p>
            <Button asChild variant="outline" className="mt-7">
              <Link to="/dashboard">
                Inside the workspace <ArrowUpRight />
              </Link>
            </Button>
          </div>
          <div className="feature-list">
            {[
              {
                icon: Cpu,
                t: "Resource intelligence",
                d: "Live telemetry, waste scoring, and clear AI explanations for every cloud resource.",
                to: "/resource",
              },
              {
                icon: Bot,
                t: "CurbPilot autonomy",
                d: "Execute low-risk actions, review approvals, and keep critical workloads protected.",
                to: "/pilot",
              },
              {
                icon: ShieldCheck,
                t: "Impact you can verify",
                d: "Track before-and-after savings and rate every change in the audit trail.",
                to: "/impact",
              },
            ].map((x) => (
              <Link to={x.to} key={x.t} className="feature-item">
                <x.icon size={21} className="mt-1 shrink-0 text-primary" />
                <div>
                  <h3>{x.t}</h3>
                  <p>{x.d}</p>
                </div>
                <ArrowUpRight size={15} className="ml-auto shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="section-shell flex flex-wrap items-center justify-between gap-7">
        <h2 className="section-heading">Open the Command Center</h2>
        <Button asChild size="lg">
          <Link to="/dashboard">
            Launch your workspace <ArrowRight />
          </Link>
        </Button>
      </section>
      <footer className="border-t">
        <div className="site-footer">
          <Brand />
          <span>© 2026 CloudCurb AI</span>
          <span>All cloud data and projected results are simulated.</span>
        </div>
      </footer>
    </div>
  );
}

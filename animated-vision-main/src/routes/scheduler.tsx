import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarClock, MapPin, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Page } from "@/components/ui-kit";
import { formatInr } from "@/lib/format";
import { relocationRecommendation, scheduleRecommendations } from "@/lib/scheduler-relocator";

export const Route = createFileRoute("/scheduler")({
  head: () => ({
    meta: [
      { title: "Scheduler + Relocator — CloudCurb AI" },
      {
        name: "description",
        content:
          "Review simulated low-carbon workload schedules and cloud-region relocation recommendations.",
      },
      { property: "og:title", content: "Scheduler + Relocator — CloudCurb AI" },
      {
        property: "og:description",
        content:
          "Choose when and where cloud workloads should run with carbon-aware recommendations.",
      },
    ],
  }),
  component: SchedulerRelocatorPage,
});

function SchedulerRelocatorPage() {
  return (
    <Page
      title="Scheduler + Relocator"
      right={
        <span className="scheduler-simulation-label">
          <span className="status-dot" />
          Simulated recommendations
        </span>
      }
    >
      <section className="scheduler-section" aria-labelledby="scheduler-heading">
        <div className="scheduler-section-heading">
          <span className="scheduler-section-icon">
            <CalendarClock size={19} />
          </span>
          <div>
            <h2 id="scheduler-heading">Carbon-aware Scheduler</h2>
            <p>Move flexible batch workloads into lower-carbon hours.</p>
          </div>
        </div>
        <div className="scheduler-recommendation-grid">
          {scheduleRecommendations.map((recommendation) => (
            <article className="scheduler-card" key={recommendation.resource.id}>
              <div className="scheduler-card-heading">
                <div>
                  <span className="scheduler-card-kicker">AI WORKLOAD</span>
                  <h3>{recommendation.resource.name}</h3>
                  <p>{recommendation.resource.type}</p>
                </div>
                <span className={`status-tag status-${recommendation.resource.risk.toLowerCase()}`}>
                  {recommendation.resource.risk} risk
                </span>
              </div>
              <div className="schedule-shift" aria-label="Recommended schedule change">
                <div>
                  <span>Current schedule</span>
                  <strong>{recommendation.currentSchedule}</strong>
                </div>
                <ArrowRight size={17} aria-hidden="true" />
                <div className="schedule-shift-recommended">
                  <span>Recommended</span>
                  <strong>{recommendation.recommendedSchedule}</strong>
                </div>
              </div>
              <p className="scheduler-reason">{recommendation.reason}</p>
              <dl className="scheduler-impact-grid">
                <div>
                  <dt>Expected CO₂ reduction</dt>
                  <dd>{recommendation.expectedCarbonReductionPercent}%</dd>
                  <small>{recommendation.expectedCarbonReductionKg} kg CO₂e / month</small>
                </div>
                <div>
                  <dt>Expected cost reduction</dt>
                  <dd>{recommendation.expectedCostReductionPercent}%</dd>
                  <small>{formatInr(recommendation.expectedCostReductionInr)} / month</small>
                </div>
              </dl>
              <p className="scheduler-estimate-note">
                Estimated from the workload efficiency score; review before applying.
              </p>
              <Button asChild size="sm" className="scheduler-review-button">
                <Link to="/pilot" search={{ opportunity: recommendation.resource.id }}>
                  <ShieldCheck size={15} />
                  Review schedule
                </Link>
              </Button>
            </article>
          ))}
        </div>
      </section>

      <section className="scheduler-section relocator-section" aria-labelledby="relocator-heading">
        <div className="scheduler-section-heading">
          <span className="scheduler-section-icon">
            <MapPin size={19} />
          </span>
          <div>
            <h2 id="relocator-heading">Carbon-aware Relocator</h2>
            <p>
              Compare regional grid intensity and estimated monthly impact before requesting a move.
            </p>
          </div>
        </div>
        <article className="relocator-card">
          <div className="relocator-resource">
            <span className="scheduler-card-kicker">HIGH-CARBON WORKLOAD</span>
            <h3>{relocationRecommendation.resource.name}</h3>
            <p>{relocationRecommendation.resource.type}</p>
          </div>
          <div className="relocator-route">
            <div className="relocator-location">
              <span>Current</span>
              <strong>{relocationRecommendation.sourceGroup}</strong>
              <small>
                {relocationRecommendation.sourceServer} ·{" "}
                {relocationRecommendation.sourceRegion.region}
              </small>
              <small>{relocationRecommendation.sourceRegion.g} gCO₂/kWh</small>
            </div>
            <div className="relocator-route-arrow" aria-hidden="true">
              <ArrowRight />
            </div>
            <div className="relocator-location relocator-location-target">
              <span>Recommended</span>
              <strong>{relocationRecommendation.targetGroup}</strong>
              <small>
                {relocationRecommendation.target.name} · {relocationRecommendation.target.region}
              </small>
              <small>{relocationRecommendation.target.g} gCO₂/kWh</small>
            </div>
          </div>
          <div className="relocator-impact">
            <div>
              <span>Estimated grid-intensity reduction</span>
              <strong>{relocationRecommendation.carbonIntensityReductionPercent}%</strong>
              <small>≈ {relocationRecommendation.expectedCarbonReductionKg} kg CO₂e / month</small>
            </div>
            <div>
              <span>Estimated monthly cost change</span>
              <strong
                className={
                  relocationRecommendation.estimatedCostChangePercent >= 0
                    ? "text-primary"
                    : "text-warn"
                }
              >
                {relocationRecommendation.estimatedCostChangePercent > 0 ? "−" : "+"}
                {Math.abs(relocationRecommendation.estimatedCostChangePercent)}%
              </strong>
              <small>
                {relocationRecommendation.estimatedCostChangePercent >= 0
                  ? "lower regional price estimate"
                  : "higher regional price estimate"}
              </small>
            </div>
          </div>
          <p className="scheduler-reason">{relocationRecommendation.reason}</p>
          <div className="relocator-safety-note">
            <Zap size={15} />
            High-risk migration: CurbPilot keeps this recommendation blocked from automated
            execution.
          </div>
          <Button asChild variant="outline" size="sm" className="scheduler-review-button">
            <Link to="/pilot" search={{ opportunity: relocationRecommendation.resource.id }}>
              <ShieldCheck size={15} />
              Review relocation policy
            </Link>
          </Button>
        </article>
      </section>
    </Page>
  );
}

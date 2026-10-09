import type { ReactNode } from "react";
import { BrandLogo, BrandMark } from "@/components/brand-logo";
import { Link } from "@tanstack/react-router";
import { formatInrCompact } from "@/lib/format";
import { rawMetrics } from "@/lib/raw-cloud";

export function AuthShell({
  title,
  sub,
  children,
}: {
  title: string;
  sub: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 flex" aria-label="CloudCurb AI home">
            <BrandLogo size={40} />
          </Link>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mb-6 text-sm text-muted-foreground">{sub}</p>
          {children}
        </div>
      </div>
      <div className="auth-art hidden flex-col justify-center p-12 lg:flex">
        <BrandMark size={96} />
        <h2 className="mt-6 text-3xl font-bold">Your cloud at a glance</h2>
        <div className="mt-10 grid grid-cols-3 gap-3">
          {[
            [String(rawMetrics.resources), "Resources"],
            [formatInrCompact(rawMetrics.monthlyCost), "Spend / month"],
            [`${rawMetrics.carbonTonnes} t`, "CO₂e / month"],
          ].map(([v, l]) => (
            <div key={l} className="rounded-lg border border-border p-4">
              <div className="font-mono text-xl font-bold text-primary">{v}</div>
              <div className="text-xs text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export const inputCls =
  "w-full rounded-lg border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

export function GoogleBtn() {
  return (
    <button type="button" className="btn-ghost w-full justify-center !py-2.5">
      Continue with Google
    </button>
  );
}

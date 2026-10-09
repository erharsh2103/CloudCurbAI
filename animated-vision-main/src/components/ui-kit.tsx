import type { ReactNode } from "react";

export function Page({
  title,
  children,
  right,
}: {
  title: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

export function Card({
  title,
  children,
  className = "",
  right,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  right?: ReactNode;
}) {
  return (
    <div className={`glass p-5 ${className}`}>
      {title && (
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {title}
          </h3>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  delta,
  good = true,
}: {
  label: string;
  value: string;
  delta?: string;
  good?: boolean;
}) {
  return (
    <div className="glass p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-2xl font-semibold">{value}</div>
      {delta && (
        <div className={`mt-1 text-xs ${good ? "text-primary" : "text-danger"}`}>{delta}</div>
      )}
    </div>
  );
}

const riskCls = {
  Low: "text-primary bg-primary/10",
  Medium: "text-warn bg-warn/10",
  High: "text-danger bg-danger/10",
} as const;
export function Risk({ r }: { r: "Low" | "Medium" | "High" }) {
  return <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${riskCls[r]}`}>{r}</span>;
}

export function Bar({ v, cls = "bg-primary" }: { v: number; cls?: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-muted">
      <div
        className={`h-full rounded-full ${cls} transition-all duration-700`}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

export const tip = {
  contentStyle: {
    background: "var(--card)",
    color: "var(--foreground)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: 12,
  },
};
export const C = {
  primary: "var(--primary)",
  info: "var(--info)",
  warn: "var(--warn)",
  danger: "var(--danger)",
  grid: "var(--border)",
  axis: "var(--muted-foreground)",
};

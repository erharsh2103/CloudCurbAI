import { useEffect, useRef, useState } from "react";

export type TrendPoint = { m: string; tonnes: number };

const PADDING = { top: 18, right: 16, bottom: 34, left: 56 };

// Round steps (1, 2, 5, 10 × 10ⁿ) so the axis reads 20 t, 25 t, 30 t… never 17 t or 33 t.
function niceStep(range: number, targetTicks: number) {
  const raw = range / targetTicks;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return factor * magnitude;
}

export function getTrendScale(values: number[], targetTicks = 4) {
  const high = Math.max(...values);
  const low = Math.min(...values);
  const paddedLow = Math.max(0, low - (high - low || high) * 0.15);
  const step = niceStep(high - paddedLow || 1, targetTicks);
  const min = Math.floor(paddedLow / step) * step;
  const max = Math.ceil(high / step) * step;
  const ticks: number[] = [];
  for (let tick = min; tick <= max + step / 2; tick += step)
    ticks.push(Math.round(tick * 100) / 100);
  return { min, max, ticks };
}

export function TrendChart({
  months,
  projected,
  scaleValues,
  label,
}: {
  months: TrendPoint[];
  projected?: TrendPoint[] | undefined;
  /** Every value the chart can show, so the axis stays fixed when the period changes. */
  scaleValues: number[];
  label: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [hovered, setHovered] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const measure = () => setWidth(Math.max(280, Math.round(container.clientWidth)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setHovered(null);
    setPinned(null);
  }, [months[0]?.m]);

  const height = width < 520 ? 240 : 290;
  const plotWidth = width - PADDING.left - PADDING.right;
  const plotHeight = height - PADDING.top - PADDING.bottom;
  const band = plotWidth / months.length;
  const { min, max, ticks } = getTrendScale(scaleValues);
  const x = (index: number) => PADDING.left + band * (index + 0.5);
  const y = (value: number) => PADDING.top + (1 - (value - min) / (max - min)) * plotHeight;
  const linePoints = (points: TrendPoint[]) =>
    points.map((point, index) => `${x(index)},${y(point.tonnes)}`).join(" ");
  const baseline = PADDING.top + plotHeight;
  const areaPath = `M ${x(0)},${baseline} L ${months
    .map((point, index) => `${x(index)},${y(point.tonnes)}`)
    .join(" L ")} L ${x(months.length - 1)},${baseline} Z`;
  const active = hovered ?? pinned;
  const activePoint = active === null ? undefined : months[active];
  const windowKey = months.map((point) => point.m).join("-");

  return (
    <div className="trend-chart" ref={containerRef}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={label}
      >
        <defs>
          <linearGradient id="trend-area-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PADDING.left}
              x2={width - PADDING.right}
              y1={y(tick)}
              y2={y(tick)}
              className="trend-grid-line"
            />
            <text
              x={PADDING.left - 10}
              y={y(tick) + 4}
              textAnchor="end"
              className="trend-axis-label"
            >
              {tick} t
            </text>
          </g>
        ))}
        {months.map((point, index) => (
          <text
            key={point.m}
            x={x(index)}
            y={height - 10}
            textAnchor="middle"
            className={`trend-axis-label${active === index ? " is-active" : ""}`}
          >
            {point.m}
          </text>
        ))}
        <path
          key={`area-${windowKey}`}
          d={areaPath}
          className="trend-area"
          fill="url(#trend-area-fill)"
        />
        <polyline
          key={`line-${windowKey}`}
          className="trend-line"
          pathLength={1}
          points={linePoints(months)}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {projected && (
          <polyline
            key={`projected-${windowKey}`}
            className="trend-line trend-line-projected"
            pathLength={1}
            points={linePoints(projected)}
            fill="none"
            stroke="var(--info)"
            strokeWidth="3"
            strokeDasharray="7 5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {active !== null && (
          <line
            x1={x(active)}
            x2={x(active)}
            y1={PADDING.top}
            y2={baseline}
            className="trend-cursor"
          />
        )}
        {months.map((point, index) => (
          <circle
            key={`${windowKey}-${point.m}`}
            className="trend-point"
            cx={x(index)}
            cy={y(point.tonnes)}
            r={active === index ? 6 : 4.5}
            style={{ animationDelay: `${index * 90}ms` }}
            fill="var(--primary)"
            aria-hidden="true"
          />
        ))}
        {projected?.map((point, index) => (
          <circle
            key={`${windowKey}-projected-${point.m}`}
            className="trend-point"
            cx={x(index)}
            cy={y(point.tonnes)}
            r="3.5"
            style={{ animationDelay: `${350 + index * 90}ms` }}
            fill="var(--info)"
            aria-hidden="true"
          />
        ))}
        {months.map((point, index) => (
          <rect
            key={`hit-${point.m}`}
            className={`trend-month-hit${active === index ? " is-active" : ""}`}
            x={x(index) - band / 2}
            y={PADDING.top}
            width={band}
            height={plotHeight}
            role="button"
            tabIndex={0}
            aria-label={`${point.m}: ${point.tonnes.toFixed(1)} tonnes CO₂e. Select to pin details.`}
            onPointerEnter={() => setHovered(index)}
            onPointerLeave={() => setHovered(null)}
            onFocus={() => setHovered(index)}
            onBlur={() => setHovered(null)}
            onClick={() => setPinned((current) => (current === index ? null : index))}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setPinned((current) => (current === index ? null : index));
              }
            }}
          />
        ))}
      </svg>
      {active !== null && activePoint && (
        <div
          className="trend-tooltip-card"
          style={{
            left: Math.min(Math.max(x(active), 90), width - 90),
            top: Math.max(y(activePoint.tonnes) - 14, 0),
          }}
          aria-hidden="true"
        >
          <span>{activePoint.m} · monthly total</span>
          <strong>
            <i className="trend-dot trend-dot-co2" />
            {activePoint.tonnes.toFixed(1)} t CO₂e
          </strong>
          {projected?.[active] && (
            <strong>
              <i className="trend-dot trend-dot-projected-solid" />
              {projected[active]!.tonnes.toFixed(1)} t with AI
            </strong>
          )}
        </div>
      )}
    </div>
  );
}

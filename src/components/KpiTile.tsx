import type { ReactNode } from "react";
import { Icon } from "./Icon";

/** Trend line of a figure over the last weeks; the last point is marked. */
function Sparkline({ values, label }: { values: number[]; label: string }) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const w = 120;
  const h = 34;
  // Keep the last point inside the drawing so its dot is not cut off.
  const points = values.map((v, i) => [(i / (values.length - 1)) * (w - 5), h - 4 - ((v - min) / span) * (h - 10)] as const);
  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [lx, ly] = points[points.length - 1];
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label={label}>
      <polygon points={`0,${h} ${line} ${w},${h}`} className="spark-area" />
      <polyline points={line} className="spark-line" vectorEffect="non-scaling-stroke" />
      <circle cx={lx} cy={ly} r="2.6" className="spark-dot" />
    </svg>
  );
}

/** One dot per person: filled for those counted. Works for the small numbers of a team. */
function Dots({ done, total }: { done: number; total: number }) {
  return (
    <span className="dots" role="img" aria-label={`${done} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={i < done ? "on" : ""} />
      ))}
    </span>
  );
}

/**
 * A key figure: what it is, the number, how it changed, and its trend or parts.
 * The whole tile leads to the list or analysis behind the number.
 */
export function KpiTile({
  icon,
  label,
  value,
  unit,
  sub,
  delta,
  spark,
  dots,
  href,
}: {
  icon: string;
  label: string;
  value: ReactNode;
  unit?: string;
  sub: string;
  /** Change against four weeks ago, already worded, e.g. "+12". */
  delta?: string;
  spark?: number[];
  dots?: { done: number; total: number };
  href: string;
}) {
  return (
    <a className="tile" href={href}>
      <span className="tile-top">
        <span className="tile-icon">
          <Icon name={icon} />
        </span>
        <span className="tile-label">{label}</span>
        {delta && <span className="tile-delta">{delta}</span>}
      </span>
      <span className="tile-value">
        {value}
        {unit && <small>{unit}</small>}
      </span>
      <span className="tile-sub">{sub}</span>
      {spark && spark.length > 1 && <Sparkline values={spark} label={`Trend over ${spark.length} weeks, from ${Math.round(spark[0])} to ${Math.round(spark[spark.length - 1])}`} />}
      {dots && <Dots done={dots.done} total={dots.total} />}
    </a>
  );
}

export function Tiles({ children }: { children: ReactNode }) {
  return <div className="tiles">{children}</div>;
}

/** "+5" or "−2" with a unit, or nothing when there is no change. */
export function change(now: number, before: number, unit = ""): string | undefined {
  const d = Math.round(now - before);
  if (d === 0) return undefined;
  return `${d > 0 ? "+" : "−"}${Math.abs(d)}${unit} in 4 weeks`;
}

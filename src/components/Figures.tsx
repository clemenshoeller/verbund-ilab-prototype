import type { ReactNode } from "react";
import type { Cell } from "../lib/metrics";
import { MIN_GROUP } from "../lib/metrics";

/** Stat tile: a label, one number, an optional line of context. */
export function Kpi({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="kpi">
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{value}</span>
      {sub && <span className="kpi-sub">{sub}</span>}
    </div>
  );
}

export function KpiRow({ children }: { children: ReactNode }) {
  return <section className="kpis">{children}</section>;
}

/** One hue, light to dark: the more people reach the level, the darker the cell. */
const STEPS = [
  { upTo: 0, cls: "s0", label: "0%" },
  { upTo: 0.249, cls: "s1", label: "1–24%" },
  { upTo: 0.499, cls: "s2", label: "25–49%" },
  { upTo: 0.749, cls: "s3", label: "50–74%" },
  { upTo: 1, cls: "s4", label: "75–100%" },
];
const stepOf = (share: number) => STEPS.find((s) => share <= s.upTo) ?? STEPS[STEPS.length - 1];

/** Heatmap cell with the share printed in it; small groups and unused cells stay empty. */
export function ShareCell({ cell, what, onOpen }: { cell: Cell | null; what: string; onOpen?: () => void }) {
  if (!cell) return <td className="cell na" title="Not part of this profile" />;
  if (cell.hidden)
    return (
      <td className="cell open" title={`Fewer than ${MIN_GROUP} rated employees, not shown`}>
        n&lt;{MIN_GROUP}
      </td>
    );
  return (
    <td className={`cell ${stepOf(1 - cell.share).cls}` + (onOpen ? " openable" : "")}>
      <button type="button" title={`${what}: ${cell.reached} of ${cell.assessed} rated employees reach it, ${cell.missingLevels} steps missing in total. Click for details.`} onClick={onOpen}>
        {Math.round((1 - cell.share) * 100)}%
      </button>
    </td>
  );
}

export function ShareLegend() {
  return (
    <p className="legend small">
      {STEPS.map((step) => (
        <span key={step.cls}>
          <i className={`cell ${step.cls}`} /> {step.label}
        </span>
      ))}
      <span>
        <i className="cell open" /> fewer than {MIN_GROUP} rated
      </span>
      <span>
        <i className="cell na" /> not in the profile
      </span>
    </p>
  );
}

/** One row of a meter list: name, bar against its own whole, figure. */
export function Meter({ name, sub, value, of }: { name: string; sub?: string; value: number; of: number }) {
  const share = of ? value / of : 0;
  return (
    <div className={"meter" + (name ? "" : " bare")} title={`${name ? name + ": " : ""}${value} of ${of} (${Math.round(share * 100)}%)`}>
      {name && (
        <span className="meter-name">
          {name}
          {sub && <span className="sub">{sub}</span>}
        </span>
      )}
      <span className="meter-track" role="img" aria-label={`${value} of ${of}`}>
        <span className="meter-fill" style={{ width: `${share * 100}%` }} />
      </span>
      <span className="meter-figure">
        {value} of {of}
      </span>
    </div>
  );
}

export function DraftTag({ children = "Draft" }: { children?: ReactNode }) {
  return <span className="draft">{children}</span>;
}

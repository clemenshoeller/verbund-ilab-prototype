import type { GapRow } from "../lib/gap";
import type { Level } from "../types";

/**
 * Spider chart of one person's profile: one axis per competency of the job family,
 * rings for the levels. Idea taken from Abdullah's "Team skills compass" prototype
 * and rebuilt here as a component in the VERBUND look.
 */

export type RadarStyle = "area" | "self" | "target";

export interface RadarSeries {
  style: RadarStyle;
  label: string;
  /** One value per axis, in the order of the axes; null = not rated. */
  values: (number | null)[];
}

const W = 500;
const H = 370;
const CX = W / 2;
const CY = H / 2 + 2;
const R = 122;

function point(i: number, n: number, value: number, max: number): [number, number] {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const r = (R * value) / max;
  return [CX + Math.cos(angle) * r, CY + Math.sin(angle) * r];
}

const polygon = (values: number[], max: number) =>
  values.map((v, i) => point(i, values.length, v, max).map((x) => x.toFixed(1)).join(",")).join(" ");

/** Splits a label into at most two lines of similar length, so long labels fit beside the chart. */
function twoLines(label: string): string[] {
  const words = label.split(" ");
  if (words.length < 2 || label.length <= 10) return [label];
  let best = 1;
  for (let i = 1; i < words.length; i++) {
    const diff = (k: number) => Math.abs(words.slice(0, k).join(" ").length - words.slice(k).join(" ").length);
    if (diff(i) < diff(best)) best = i;
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}

const levelName = (levels: Level[], value: number | null) =>
  value === null ? "–" : value === 0 ? "Not yet" : (levels[value - 1]?.name ?? String(value));

export function Radar({ axes, series, levels, title }: { axes: { label: string; full: string }[]; series: RadarSeries[]; levels: Level[]; title: string }) {
  const max = levels.length;
  const n = axes.length;
  // A line is only drawn when every axis has a value; a half-drawn shape would mislead.
  const drawn = series.filter((s) => s.values.length === n && s.values.every((v) => v !== null));
  const partial = series.filter((s) => !drawn.includes(s) && s.values.some((v) => v !== null));
  const order: RadarStyle[] = ["area", "target", "self"];
  const layers = [...drawn].sort((a, b) => order.indexOf(a.style) - order.indexOf(b.style));

  return (
    <figure className="radar">
      <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {levels.map((level) => (
          <polygon key={level.value} className={"r-ring" + (level.value === max ? " outer" : "")} points={polygon(axes.map(() => level.value), max)} />
        ))}
        {axes.map((axis, i) => {
          const [x, y] = point(i, n, max, max);
          const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          const lx = CX + cos * (R + 12);
          const ly = CY + sin * (R + 12);
          const lines = twoLines(axis.label);
          // First line offset in em, so the labels stay in place when the font grows on phones.
          const first = sin < -0.6 ? -(lines.length - 1) * 1.1 - 0.4 : sin > 0.6 ? 1 : 0.35 - (lines.length - 1) * 0.55;
          return (
            <g key={axis.label}>
              <line className="r-spoke" x1={CX} y1={CY} x2={x.toFixed(1)} y2={y.toFixed(1)} />
              <text className="r-lab" x={lx.toFixed(1)} y={ly.toFixed(1)} textAnchor={cos > 0.25 ? "start" : cos < -0.25 ? "end" : "middle"}>
                <title>{axis.full}</title>
                {lines.map((line, j) => (
                  <tspan key={line} x={lx.toFixed(1)} dy={`${j === 0 ? first : 1.1}em`}>
                    {line}
                  </tspan>
                ))}
              </text>
            </g>
          );
        })}
        {levels.map((level) => (
          <text key={level.value} className="r-num" x={CX + 5} y={CY - (R * level.value) / max + 11}>
            {level.value}
          </text>
        ))}
        {layers.map((s) => (
          <g key={s.label} className={"r-series r-" + s.style} style={{ transformOrigin: `${CX}px ${CY}px` }}>
            <polygon points={polygon(s.values as number[], max)} />
            {s.style === "area" &&
              (s.values as number[]).map((v, i) => {
                const [x, y] = point(i, n, v, max);
                return <circle key={axes[i].label} cx={x.toFixed(1)} cy={y.toFixed(1)} r={3.5} />;
              })}
          </g>
        ))}
      </svg>
      <figcaption>
        <ul className="radar-key">
          {layers.map((s) => (
            <li key={s.label}>
              <i className={"k-" + s.style} aria-hidden="true" />
              {s.label}
            </li>
          ))}
        </ul>
        {partial.map((s) => (
          <p key={s.label} className="radar-hint">
            {s.label}: shown once all {n} competencies are rated.
          </p>
        ))}
      </figcaption>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Competency</th>
            {layers.map((s) => (
              <th key={s.label} scope="col">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {axes.map((axis, i) => (
            <tr key={axis.label}>
              <th scope="row">{axis.full}</th>
              {layers.map((s) => (
                <td key={s.label}>{levelName(levels, s.values[i])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Radar of a person's profile rows: the level as area, an optional self-check, the 2030 target. */
export function ProfileRadar({
  rows,
  levels,
  levelLabel,
  self,
  title,
}: {
  rows: GapRow[];
  levels: Level[];
  levelLabel: string;
  self?: { label: string; values: (number | null)[] };
  title: string;
}) {
  const series: RadarSeries[] = [
    { style: "area", label: levelLabel, values: rows.map((r) => r.agreed) },
    { style: "target", label: "2030 target", values: rows.map((r) => r.target) },
  ];
  if (self) series.push({ style: "self", label: self.label, values: self.values });
  return <Radar axes={rows.map((r) => ({ label: r.competency.short, full: r.competency.name }))} series={series} levels={levels} title={title} />;
}

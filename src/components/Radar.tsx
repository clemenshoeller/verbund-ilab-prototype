import { useId, useState } from "react";
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
  /** Short explanation shown next to the key. */
  note?: string;
  /** One value per axis, in the order of the axes; null = not rated. */
  values: (number | null)[];
}

const W = 500;
const H = 380;
const CX = W / 2;
const CY = H / 2;
const R = 122;
const ORDER: RadarStyle[] = ["area", "target", "self"];

const angleOf = (i: number, n: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;

function point(i: number, n: number, value: number, max: number): [number, number] {
  const angle = angleOf(i, n);
  const r = (R * value) / max;
  return [CX + Math.cos(angle) * r, CY + Math.sin(angle) * r];
}

const polygon = (values: number[], max: number) =>
  values.map((v, i) => point(i, values.length, v, max).map((x) => x.toFixed(1)).join(",")).join(" ");

/** Splits a long label into two lines of similar length, so it fits beside the chart. */
function twoLines(label: string): string[] {
  const words = label.split(" ");
  if (words.length < 2 || label.length <= 10) return [label];
  let best = 1;
  const diff = (k: number) => Math.abs(words.slice(0, k).join(" ").length - words.slice(k).join(" ").length);
  for (let i = 1; i < words.length; i++) if (diff(i) < diff(best)) best = i;
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}

const levelName = (levels: Level[], value: number | null) =>
  value === null ? "–" : value === 0 ? "Not yet" : (levels[value - 1]?.name ?? String(value));

export function Radar({
  axes,
  series,
  levels,
  title,
  onSelect,
}: {
  axes: { id: string; label: string; full: string }[];
  series: RadarSeries[];
  levels: Level[];
  title: string;
  /** Called with the axis id when a competency is clicked in the chart. */
  onSelect?: (id: string) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number; w: number } | null>(null);
  const gradient = `radar-fill-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const max = levels.length;
  const n = axes.length;
  // A line is only drawn when every axis has a value; a half-drawn shape would mislead.
  const drawn = series.filter((s) => s.values.length === n && s.values.every((v) => v !== null));
  const partial = series.filter((s) => !drawn.includes(s) && s.values.some((v) => v !== null));
  const layers = [...drawn].sort((a, b) => ORDER.indexOf(a.style) - ORDER.indexOf(b.style));
  const rings = [...levels].reverse();

  const labelAt = (i: number) => {
    const angle = angleOf(i, n);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return { x: CX + cos * (R + 14), y: CY + sin * (R + 14), cos, sin };
  };

  return (
    <figure className="radar">
      <div className="radar-in">
        <div
          className="radar-chart"
          onPointerLeave={() => setHover(null)}
          onPointerMove={(event) => {
            const box = event.currentTarget.getBoundingClientRect();
            setPointer({ x: event.clientX - box.left, y: event.clientY - box.top, w: box.width });
          }}
        >
          <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
            <defs>
              <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#00488e" stopOpacity="0.34" />
                <stop offset="1" stopColor="#00488e" stopOpacity="0.12" />
              </linearGradient>
            </defs>
            {rings.map((level) => (
              <polygon key={level.value} className={`r-ring r-ring-${level.value % 2 ? "odd" : "even"}`} points={polygon(axes.map(() => level.value), max)} />
            ))}
            {axes.map((axis, i) => {
              const [x, y] = point(i, n, max, max);
              return <line key={axis.id} className={`r-spoke${hover === i ? " on" : ""}`} x1={CX} y1={CY} x2={x.toFixed(1)} y2={y.toFixed(1)} />;
            })}
            {levels.map((level) => {
              // Level names sit on the bisector between the first two axes, where no axis label is.
              const between = angleOf(0.5, n);
              const r = ((R * level.value) / max) * Math.cos(Math.PI / n) - 9;
              return (
                <text key={level.value} className="r-num" x={(CX + Math.cos(between) * r).toFixed(1)} y={(CY + Math.sin(between) * r + 3).toFixed(1)} textAnchor="middle">
                  <tspan className="r-num-name">{level.name}</tspan>
                  <tspan className="r-num-short">{level.value}</tspan>
                </text>
              );
            })}
            {layers.map((s) => (
              <g key={s.label} className={`r-series r-${s.style}`} style={{ transformOrigin: `${CX}px ${CY}px` }}>
                <polygon points={polygon(s.values as number[], max)} style={s.style === "area" ? { fill: `url(#${gradient})` } : undefined} />
                {(s.values as number[]).map((v, i) => {
                  const [x, y] = point(i, n, v, max);
                  return <circle key={axes[i].id} className={hover === i ? "on" : undefined} cx={x.toFixed(1)} cy={y.toFixed(1)} r={s.style === "area" ? 4.5 : 3} />;
                })}
              </g>
            ))}
            {axes.map((axis, i) => {
              const { x, y, cos, sin } = labelAt(i);
              const lines = twoLines(axis.label);
              // Offset of the first line in em, so the labels stay in place when the font grows on phones.
              const first = sin < -0.6 ? -(lines.length - 1) * 1.1 - 0.35 : sin > 0.6 ? 1 : 0.35 - (lines.length - 1) * 0.55;
              // Wedge around the axis that reacts to the pointer.
              const a = angleOf(i, n);
              const half = Math.PI / n;
              const far = R + 70;
              const wedge = [
                [CX, CY],
                [CX + Math.cos(a - half) * far, CY + Math.sin(a - half) * far],
                [CX + Math.cos(a) * far * 1.1, CY + Math.sin(a) * far * 1.1],
                [CX + Math.cos(a + half) * far, CY + Math.sin(a + half) * far],
              ]
                .map((p) => p.map((v) => v.toFixed(1)).join(","))
                .join(" ");
              return (
                // biome-ignore lint/a11y/useKeyWithClickEvents: shortcut for pointer users; keyboard users open the same line in the list below
                // biome-ignore lint/a11y/noStaticElementInteractions: same reason, the chart is hidden from assistive technology
                <g key={axis.id} className={`r-axis${hover === i ? " on" : ""}${onSelect ? " pick" : ""}`} onPointerEnter={() => setHover(i)} onClick={() => onSelect?.(axis.id)}>
                  <polygon className="r-hit" points={wedge} />
                  <text className="r-lab" x={x.toFixed(1)} y={y.toFixed(1)} textAnchor={cos > 0.25 ? "start" : cos < -0.25 ? "end" : "middle"}>
                    {lines.map((line, j) => (
                      <tspan key={line} x={x.toFixed(1)} dy={`${j === 0 ? first : 1.1}em`}>
                        {line}
                      </tspan>
                    ))}
                  </text>
                </g>
              );
            })}
          </svg>
          {hover !== null && pointer && (
            <div
              className={`radar-tip ${pointer.y < 120 ? "below" : "above"}`}
              style={{ left: Math.min(Math.max(pointer.x, 115), pointer.w - 115), top: pointer.y }}
              aria-hidden="true"
            >
              <strong>{axes[hover].full}</strong>
              {layers.map((s) => (
                <span key={s.label}>
                  <i className={`k-${s.style}`} />
                  {s.label}
                  <b>{levelName(levels, s.values[hover])}</b>
                </span>
              ))}
            </div>
          )}
        </div>
        <figcaption>
          <ul className="radar-key">
            {layers.map((s) => (
              <li key={s.label}>
                <i className={`k-${s.style}`} aria-hidden="true" />
                <span>
                  {s.label}
                  {s.note && <span className="sub">{s.note}</span>}
                </span>
              </li>
            ))}
          </ul>
          {partial.map((s) => (
            <p key={s.label} className="radar-hint">
              {s.label}: shown once all {n} competencies are rated.
            </p>
          ))}
          {onSelect && <p className="radar-hint pointer-only">Point at a competency to compare, click it to open the details.</p>}
        </figcaption>
      </div>
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
            <tr key={axis.id}>
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

/** Opens the competency line below the chart and brings it into view. */
export function openCompetency(id: string) {
  const details = document.getElementById(`comp-${id}`) as HTMLDetailsElement | null;
  if (!details) return;
  details.open = true;
  details.querySelector("summary")?.focus({ preventScroll: true });
  details.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
}

/** Radar of a person's profile rows: the level as area, an optional self-check, the 2030 target. */
export function ProfileRadar({
  rows,
  levels,
  level,
  self,
  title,
}: {
  rows: GapRow[];
  levels: Level[];
  level: { label: string; note?: string };
  self?: { label: string; note?: string; values: (number | null)[] };
  title: string;
}) {
  const series: RadarSeries[] = [
    { style: "area", label: level.label, note: level.note, values: rows.map((r) => r.agreed) },
    { style: "target", label: "2030 target", note: "What the job family needs", values: rows.map((r) => r.target) },
  ];
  if (self) series.push({ style: "self", label: self.label, note: self.note, values: self.values });
  return (
    <Radar
      axes={rows.map((r) => ({ id: r.competency.id, label: r.competency.short, full: r.competency.name }))}
      series={series}
      levels={levels}
      title={title}
      onSelect={openCompetency}
    />
  );
}

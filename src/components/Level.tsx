import type { Level } from "../types";

/** Three segments: filled up to `value`, an outline marks the `target` if given. */
export function LevelBar({ value, target, max = 3 }: { value: number | null; target?: number; max?: number }) {
  const label =
    value === null ? "not rated" : `level ${value} of ${max}` + (target !== undefined ? `, target ${target}` : "");
  return (
    <span className="levelbar" role="img" aria-label={label}>
      {Array.from({ length: max }, (_, i) => {
        const filled = value !== null && i < value;
        const wanted = target !== undefined && i < target;
        return <span key={i} className={"seg" + (filled ? " filled" : wanted ? " wanted" : "")} />;
      })}
    </span>
  );
}

export function LevelPicker({
  label,
  value,
  levels,
  onChange,
  strong,
}: {
  label: string;
  value: number | null;
  levels: Level[];
  onChange: (value: number) => void;
  strong?: boolean;
}) {
  const options = [{ value: 0, name: "Not yet" }, ...levels];
  return (
    <div className={"picker" + (strong ? " strong" : "")} role="group" aria-label={label}>
      <span className="picker-label">{label}</span>
      <span className="picker-options">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={"pick" + (value === option.value ? " on" : "")}
            aria-pressed={value === option.value}
            title={option.name}
            onClick={() => onChange(option.value)}
          >
            <span className="pick-num">{option.value}</span>
            <span className="pick-name">{option.name}</span>
          </button>
        ))}
      </span>
    </div>
  );
}

export function StatusChip({ status }: { status: "open" | "in-progress" | "completed" }) {
  const text = { open: "Open", "in-progress": "In progress", completed: "Completed" }[status];
  return <span className={"chip " + status}>{text}</span>;
}

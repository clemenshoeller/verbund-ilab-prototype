import type { Level } from "../types";

/**
 * The three levels as steps on a track: filled up to the level reached,
 * a ring where the 2030 target sits, a small tick for the level expected today.
 * Read left to right, like a path the person walks.
 */
export function Steps({
  value,
  target,
  baseline,
  levels,
  compact,
}: {
  value: number | null;
  target: number;
  baseline?: number;
  levels: Level[];
  compact?: boolean;
}) {
  const reached = value ?? 0;
  const label =
    (value === null ? "not rated" : `level ${value} of ${levels.length}`) +
    `, 2030 target level ${target}` +
    (baseline !== undefined ? `, expected today level ${baseline}` : "");
  return (
    <span className={"steps" + (compact ? " compact" : "") + (value === null ? " unrated" : "")} role="img" aria-label={label}>
      {levels.map((level) => {
        const done = value !== null && level.value <= reached;
        const isTarget = level.value === target;
        const isToday = baseline !== undefined && level.value === baseline;
        return (
          <span key={level.value} className={"step-stop" + (done ? " done" : "") + (isTarget ? " target" : "") + (level.value <= target ? " wanted" : "")}>
            <span className="dot">{!compact && level.value}</span>
            {!compact && (
              <span className="step-name">
                {level.name}
                {isTarget && <em>2030 target</em>}
                {isToday && !isTarget && <em className="today">expected today</em>}
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

/** Explains the marks of the track once per page. */
export function StepsLegend() {
  return (
    <p className="legend small plain">
      <span>
        <i className="key done" /> level reached
      </span>
      <span>
        <i className="key target" /> 2030 target
      </span>
      <span>
        <i className="key wanted" /> still to go
      </span>
    </p>
  );
}

/** Three segments: filled up to `value`, an outline marks the `target` if given. */
export function LevelBar({ value, target, max = 3 }: { value: number | null; target?: number; max?: number }) {
  const label =
    value === null ? "not rated" : `level ${value} of ${max}` + (target !== undefined ? `, target ${target}` : "");
  return (
    <span className="levelbar" role="img" aria-label={label}>
      {Array.from({ length: max }, (_, i) => i + 1).map((level) => {
        const filled = value !== null && level <= value;
        const wanted = target !== undefined && level <= target;
        return <span key={level} className={"seg" + (filled ? " filled" : wanted ? " wanted" : "")} />;
      })}
    </span>
  );
}

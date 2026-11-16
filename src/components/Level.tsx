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

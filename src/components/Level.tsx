/** Three segments, filled up to `value`. */
export function LevelBar({ value, max = 3 }: { value: number | null; max?: number }) {
  const label = value === null ? "not rated" : `level ${value} of ${max}`;
  return (
    <span className="levelbar" role="img" aria-label={label}>
      {Array.from({ length: max }, (_, i) => i + 1).map((level) => {
        const filled = value !== null && level <= value;
        return <span key={level} className={"seg" + (filled ? " filled" : "")} />;
      })}
    </span>
  );
}

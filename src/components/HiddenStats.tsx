import { MIN_GROUP, type CompetencyStats } from "../lib/metrics";
import { Meter } from "./Figures";

/**
 * Share of rated employees who reach the 2030 target per competency, for HR.
 * A competency with fewer than five rated people is named but not shown,
 * so a figure can never be traced to one or two persons.
 */
export function CompetencyMeters({ stats }: { stats: CompetencyStats[] }) {
  const rated = stats.filter((s) => s.rated > 0);
  const shown = rated.filter((s) => !s.hidden);
  const hidden = rated.filter((s) => s.hidden);
  return (
    <>
      <div className="meters">
        {shown.map((s) => (
          <Meter key={s.competency.id} name={s.competency.name} value={s.rated - s.belowTarget} of={s.rated} />
        ))}
      </div>
      {hidden.length > 0 && (
        <p className="muted small hidden-note">
          Not shown, fewer than {MIN_GROUP} rated: {hidden.map((s) => s.competency.name).join(", ")}.
        </p>
      )}
    </>
  );
}

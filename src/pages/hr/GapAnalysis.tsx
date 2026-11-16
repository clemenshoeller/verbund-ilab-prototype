import { ShareLegend } from "../../components/Figures";
import { familyGrid, priorities, type Horizon } from "../../lib/metrics";
import { go } from "../../lib/router";
import type { Assessments, Content, Org } from "../../types";
import { FamilyHeat } from "./Dashboard";

const HORIZONS: { id: Horizon; label: string; what: string }[] = [
  { id: "baseline", label: "Today’s level", what: "today’s level" },
  { id: "target", label: "2030 target", what: "the 2030 target" },
];

export function HrGapAnalysis({
  content,
  org,
  assessments,
  horizonId,
}: {
  content: Content;
  org: Org;
  assessments: Assessments;
  horizonId?: string;
}) {
  const horizon = HORIZONS.find((h) => h.id === horizonId) ?? HORIZONS[1];
  const grid = familyGrid(content, org.employees, assessments, horizon.id);
  const rows = priorities(content, org.employees, assessments);

  return (
    <>
      <div className="page-head">
        <p className="eyebrow">HR view · gap analysis</p>
        <h1>Where the gaps are</h1>
        <p className="lead">Agreed levels compared with the target profiles, short term and for 2030.</p>
      </div>

      <section>
        <div className="section-head">
          <h2>Share of rated employees below {horizon.what}</h2>
          <div className="tabs" role="tablist" aria-label="Horizon">
            {HORIZONS.map((h) => (
              <button
                key={h.id}
                type="button"
                role="tab"
                aria-selected={h.id === horizon.id}
                className={"tab" + (h.id === horizon.id ? " on" : "")}
                onClick={() => go(`/hr/gaps/${h.id}`)}
              >
                {h.label}
              </button>
            ))}
          </div>
        </div>
        <FamilyHeat content={content} grid={grid} what={horizon.what} />
        <ShareLegend />
      </section>

      <section>
        <div className="section-head">
          <h2>Prioritised gaps</h2>
          <p className="muted">{rows.length} combinations of job family and competency with a gap</p>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th className="num">#</th>
                <th>Competency</th>
                <th>Job family</th>
                <th className="num">Rated</th>
                <th className="num">Below today’s level</th>
                <th className="num">Below 2030 target</th>
                <th className="num">Levels missing to 2030</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.family.id + row.competency.id}>
                  <td className="num muted">{index + 1}</td>
                  <td>
                    <strong>{row.competency.name}</strong>
                  </td>
                  <td>{row.family.name}</td>
                  <td className="num">{row.assessed}</td>
                  <td className="num">{row.belowToday > 0 ? <strong>{row.belowToday}</strong> : "–"}</td>
                  <td className="num">{row.belowTarget}</td>
                  <td className="num">{row.missingLevels}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small note-line">
          Order: first the number of employees below today’s level (urgency), then the levels missing to 2030 (size).
          Strategic relevance is not weighted yet.
        </p>
      </section>
    </>
  );
}

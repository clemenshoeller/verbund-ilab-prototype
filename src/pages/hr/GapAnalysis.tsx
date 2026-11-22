import { FamilyHeat } from "../../components/FamilyHeat";
import { ShareLegend } from "../../components/Figures";
import { Card, PageHead } from "../../components/Ui";
import { useData } from "../../data";
import { familyGrid, priorities, type Horizon } from "../../lib/metrics";
import { go } from "../../lib/router";
import { useUi } from "../../ui";

const HORIZONS: { id: Horizon; label: string; what: string }[] = [
  { id: "baseline", label: "Today’s level", what: "today’s expectation" },
  { id: "target", label: "2030 target", what: "the 2030 target" },
];

export function HrGapAnalysis({ horizonId }: { horizonId?: string }) {
  const { content, org, assessments } = useData();
  const { openDrawer } = useUi();
  const horizon = HORIZONS.find((h) => h.id === horizonId) ?? HORIZONS[1];
  const grid = familyGrid(content, org.employees, assessments, horizon.id);
  const rows = priorities(content, org.employees, assessments);

  return (
    <>
      <PageHead title="Gap analysis" sub="Agreed levels against the target profiles: the darker the cell, the more people are there. Click a cell or a row for the detail." />

      <Card
        title={`Share of rated employees who already reach ${horizon.what}`}
        aside={
          <span className="tabs" role="tablist" aria-label="Horizon">
            {HORIZONS.map((h) => (
              <button key={h.id} type="button" role="tab" aria-selected={h.id === horizon.id} className={"tab" + (h.id === horizon.id ? " on" : "")} onClick={() => go(`/hr/gaps/${h.id}`)}>
                {h.label}
              </button>
            ))}
          </span>
        }
        flush
      >
        <FamilyHeat content={content} grid={grid} what={horizon.what} />
        <ShareLegend />
      </Card>

      <Card title="Where to act first" aside={`Top ${Math.min(8, rows.length)} of ${rows.length}`} flush>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th className="num">#</th>
                <th>Competency</th>
                <th>Job family</th>
                <th className="num">Below today’s expectation</th>
                <th className="num">Below 2030 target</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 8).map((row, index) => (
                <tr key={row.family.id + row.competency.id} className="clickable" onClick={() => openDrawer({ type: "cell", familyId: row.family.id, competencyId: row.competency.id })}>
                  <td className="num muted">{index + 1}</td>
                  <td>
                    <button
                      type="button"
                      className="rowlink"
                      onClick={(event) => {
                        event.stopPropagation();
                        openDrawer({ type: "cell", familyId: row.family.id, competencyId: row.competency.id });
                      }}
                    >
                      {row.competency.name}
                    </button>
                  </td>
                  <td>{row.family.name}</td>
                  <td className="num">{row.belowToday > 0 ? <strong>{row.belowToday} of {row.assessed}</strong> : "–"}</td>
                  <td className="num">
                    {row.belowTarget} of {row.assessed}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small card-note">
          Ordered by urgency (below today’s expectation), then by the size of the gap to 2030.
        </p>
      </Card>
    </>
  );
}

import type { GridRow } from "../lib/metrics";
import type { Content } from "../types";
import { useUi } from "../ui";
import { ShareCell } from "./Figures";

/** Heatmap job family by competency: share of rated employees who reach the chosen horizon. */
export function FamilyHeat({ content, grid, what }: { content: Content; grid: GridRow[]; what: string }) {
  const { openDrawer } = useUi();
  return (
    <div className="table-wrap">
      <table className="table heat">
        <thead>
          <tr>
            <th>Job family</th>
            {content.competencies.map((c) => (
              <th key={c.id} className="heat-col" title={c.description}>
                <a href={`#/hr/competencies/${c.id}`}>{c.name}</a>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.map((row) => (
            <tr key={row.family.id}>
              <td>
                <a href={`#/hr/profiles/${row.family.id}`}>
                  <strong>{row.family.name}</strong>
                </a>
                <span className="sub">
                  {row.assessed} of {row.headcount} assessed
                </span>
              </td>
              {content.competencies.map((c) => (
                <ShareCell
                  key={c.id}
                  cell={row.cells[c.id]}
                  what={`${row.family.name}, ${c.name}, ${what}`}
                  onOpen={() => openDrawer({ type: "cell", familyId: row.family.id, competencyId: c.id })}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

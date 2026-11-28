import { ShareCell, ShareLegend } from "../../components/Figures";
import { SimNote } from "../../components/Learning";
import { Card, PageHead } from "../../components/Ui";
import { useData } from "../../data";
import { MIN_GROUP, percent, roleOverview, teamGrid } from "../../lib/metrics";
import { switchTo } from "../../lib/router";
import { useUi } from "../../ui";
import { HORIZONS } from "./GapAnalysis";

/** Skills dashboard per job unit: every competency of every team in one table. */
export function HrSkills({ horizonId }: { horizonId?: string }) {
  const { content, org, assessments } = useData();
  const { openDrawer } = useUi();
  const horizon = HORIZONS.find((h) => h.id === horizonId) ?? HORIZONS[0];
  const grid = teamGrid(content, org, assessments, horizon.id);

  return (
    <>
      <PageHead title="Skills by unit" sub="All competencies of all job units in one view: the darker the cell, the more of the rated employees reach the level. Click a cell for the unit." />
      <SimNote />

      <Card
        title={`Share of rated employees who reach ${horizon.what}`}
        aside={
          <span className="tabs" role="tablist" aria-label="Horizon">
            {HORIZONS.map((h) => (
              <button key={h.id} type="button" role="tab" aria-selected={h.id === horizon.id} className={"tab" + (h.id === horizon.id ? " on" : "")} onClick={() => switchTo(`/hr/skills/${h.id}`)}>
                {h.label}
              </button>
            ))}
          </span>
        }
        flush
      >
        <div className="table-wrap">
          <table className="table heat">
            <thead>
              <tr>
                <th>Job unit</th>
                {content.competencies.map((c) => (
                  <th key={c.id} className="heat-col" title={c.description}>
                    <a href={`#/hr/competencies/${c.id}`}>{c.name}</a>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.map((row) => (
                <tr key={row.team.id}>
                  <td>
                    <a href={`#/hr/teams/${row.team.id}`}>
                      <strong>{row.team.name}</strong>
                    </a>
                    <span className="sub">
                      {row.assessed} of {row.headcount} assessed
                    </span>
                  </td>
                  {content.competencies.map((c) => (
                    <ShareCell key={c.id} cell={row.cells[c.id]} what={`${row.team.name}, ${c.name}, ${horizon.what}`} onOpen={() => openDrawer({ type: "team", id: row.team.id })} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ShareLegend />
      </Card>
      <p className="muted small">
        A cell appears from {MIN_GROUP} rated employees up, so no figure can be traced to a single person. The leadership competencies are rated for one or two people
        per unit and therefore stay hidden here; they are shown for all managers together under Gap analysis.
      </p>
    </>
  );
}

/** Overview of all roles for succession planning: who holds a role, and what a successor needs. */
export function HrRoles({ familyId }: { familyId?: string }) {
  const { content, org, assessments } = useData();
  const family = content.families.find((f) => f.id === familyId);
  const all = roleOverview(content, org, assessments);
  const rows = all.filter((row) => !family || row.family.id === family.id);
  const single = rows.filter((row) => row.headcount === 1).length;

  return (
    <>
      <PageHead title="Roles" sub="Every role with the number of people who hold it and the profile a successor needs. A role held by one person is a risk when that person leaves." />

      <Card
        title={family ? family.name : "All roles"}
        aside={
          <span className="tabs" role="tablist" aria-label="Job family">
            <button type="button" role="tab" aria-selected={!family} className={"tab" + (!family ? " on" : "")} onClick={() => switchTo("/hr/roles")}>
              All
            </button>
            {content.families.map((f) => (
              <button key={f.id} type="button" role="tab" aria-selected={f.id === family?.id} className={"tab" + (f.id === family?.id ? " on" : "")} onClick={() => switchTo(`/hr/roles/${f.id}`)}>
                {f.name}
              </button>
            ))}
          </span>
        }
        flush
      >
        <p className="muted small card-note top">
          {rows.length} roles, {single} of them held by one person.
        </p>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Required profile</th>
                <th className="num">Units</th>
                <th className="num">Holders</th>
                <th className="num">Assessed</th>
                <th className="num">2030 profile reached</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.family.id + row.role}>
                  <td>
                    <strong>{row.role}</strong>
                    {row.headcount === 1 && <span className="chip single">One holder</span>}
                  </td>
                  <td>
                    <a href={`#/hr/profiles/${row.family.id}`}>{row.family.name}</a>
                  </td>
                  <td className="num">{row.units}</td>
                  <td className="num">{row.headcount}</td>
                  <td className="num">{row.assessed}</td>
                  <td className="num">{row.hidden ? `n<${MIN_GROUP}` : percent(row.progress)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small card-note">
          Holders and units come from the master data. Figures from ratings appear from {MIN_GROUP} assessed holders up; HR sees no single persons. The required profile is
          the target profile of the job family; a profile per role would follow from its job description (Competency model, Upload).
        </p>
      </Card>
    </>
  );
}

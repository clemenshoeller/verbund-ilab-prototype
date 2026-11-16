import { Kpi, KpiRow, Meter, ShareCell, ShareLegend } from "../../components/Figures";
import { MIN_GROUP, familyGrid, kpis, percent, priorities, teamCoverage } from "../../lib/metrics";
import type { Assessments, Content, Org } from "../../types";

export function HrDashboard({ content, org, assessments }: { content: Content; org: Org; assessments: Assessments }) {
  const k = kpis(content, org.employees, assessments);
  const grid = familyGrid(content, org.employees, assessments, "target");
  const top = priorities(content, org.employees, assessments).slice(0, 5);
  const coverage = teamCoverage(org, assessments);

  return (
    <>
      <div className="page-head">
        <p className="eyebrow">HR view · whole organisation</p>
        <h1>AI competencies across the organisation</h1>
        <p className="lead">
          Aggregated from the completed competency conversations. No single persons are shown; groups with fewer than{" "}
          {MIN_GROUP} rated employees stay hidden.
        </p>
      </div>

      <KpiRow>
        <Kpi label="Employees in scope" value={k.headcount} sub={`${org.teams.length} teams · ${content.families.length} job families`} />
        <Kpi
          label="Conversations completed"
          value={percent(k.completed / k.headcount)}
          sub={`${k.completed} of ${k.headcount} · ${k.inProgress} in progress`}
        />
        <Kpi label="Ratings at the 2030 target" value={percent(k.atTargetShare)} sub="of all agreed ratings" />
        <Kpi
          label="Below today’s level"
          value={k.belowTodayPeople}
          sub={`of ${k.completed} assessed employees, in at least one competency`}
        />
      </KpiRow>

      <div className="two-col">
        <section>
          <div className="section-head">
            <h2>Conversations by team</h2>
            <p className="muted">completed of headcount</p>
          </div>
          <div className="meters">
            {coverage.map((row) => (
              <Meter key={row.team.id} name={row.team.name} value={row.completed} of={row.headcount} />
            ))}
          </div>
        </section>

        <section>
          <div className="section-head">
            <h2>Largest gaps</h2>
            <a href="#/hr/gaps">Full gap analysis</a>
          </div>
          <ol className="top-list">
            {top.map((row) => (
              <li key={row.family.id + row.competency.id}>
                <span>
                  <strong>{row.competency.name}</strong>
                  <span className="sub">{row.family.name}</span>
                </span>
                <span className="top-figure">
                  <strong>{row.belowToday}</strong> below today’s level
                  <span className="sub">
                    {row.missingLevels} levels missing to 2030 · {row.assessed} rated
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section>
        <div className="section-head">
          <h2>Below the 2030 target</h2>
          <p className="muted">Share of rated employees per job family and competency</p>
        </div>
        <FamilyHeat content={content} grid={grid} what="the 2030 target" />
        <ShareLegend />
      </section>
    </>
  );
}

export function FamilyHeat({ content, grid, what }: { content: Content; grid: ReturnType<typeof familyGrid>; what: string }) {
  return (
    <div className="table-wrap">
      <table className="table heat">
        <thead>
          <tr>
            <th>Job family</th>
            {content.competencies.map((c) => (
              <th key={c.id} className="heat-col" title={c.description}>
                {c.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.map((row) => (
            <tr key={row.family.id}>
              <td>
                <strong>{row.family.name}</strong>
                <span className="sub">
                  {row.assessed} of {row.headcount} assessed
                </span>
              </td>
              {content.competencies.map((c) => (
                <ShareCell key={c.id} cell={row.cells[c.id]} what={`${row.family.name}, ${c.name}, ${what}`} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

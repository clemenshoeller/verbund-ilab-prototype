import { FamilyHeat } from "../../components/FamilyHeat";
import { Kpi, KpiRow, Meter, ShareLegend } from "../../components/Figures";
import { Card, PageHead } from "../../components/Ui";
import { useData } from "../../data";
import { MIN_GROUP, familyGrid, kpis, measureReach, percent, priorities, teamCoverage } from "../../lib/metrics";
import { measureUptake } from "../../lib/workflow";

interface Attention {
  text: string;
  detail: string;
  href: string;
  kind: string;
}

export function HrHome() {
  const { content, org, assessments, assignments } = useData();
  const k = kpis(content, org.employees, assessments);
  const grid = familyGrid(content, org.employees, assessments, "target");
  const coverage = teamCoverage(org, assessments);
  const withMeasures = org.employees.filter((e) => (assignments[e.id] ?? []).length > 0).length;

  // What HR should look at first: slow teams, urgent gaps, measures that are hardly used.
  const attention: Attention[] = [];
  for (const row of coverage.filter((c) => c.completed / c.headcount < 0.5).reverse()) {
    attention.push({
      kind: "Team",
      text: `${row.team.name}: ${row.completed} of ${row.headcount} conversations completed`,
      detail: "Less than half of the team has been assessed",
      href: `#/hr/teams/${row.team.id}`,
    });
  }
  for (const row of priorities(content, org.employees, assessments).filter((p) => p.belowToday > 0).slice(0, 3)) {
    attention.push({
      kind: "Gap",
      text: `${row.belowToday} of ${row.assessed} in ${row.family.name} are below today’s level in “${row.competency.name}”`,
      detail: `${row.missingLevels} levels missing to the 2030 target`,
      href: `#/hr/competencies/${row.competency.id}`,
    });
  }
  const unused = content.measures
    .map((m) => ({ m, reach: measureReach(content, org.employees, assessments, m), used: measureUptake(org.employees, assignments, m.id).assigned }))
    .filter((x) => x.reach > 0 && content.measureTypes.find((t) => t.id === x.m.type)?.perPerson)
    .sort((a, b) => a.used / a.reach - b.used / b.reach)[0];
  if (unused) {
    attention.push({
      kind: "Measure",
      text: `“${unused.m.title}” is agreed for ${unused.used} of ${unused.reach} employees with a fitting gap`,
      detail: "Lowest use of all measures",
      href: "#/hr/measures",
    });
  }

  return (
    <>
      <PageHead
        title="AI competencies across the organisation"
        sub={`Aggregated from the completed conversations. No single persons; groups with fewer than ${MIN_GROUP} rated employees stay hidden.`}
        actions={
          <a className="btn" href="#/hr/gaps">
            Open gap analysis
          </a>
        }
      />

      <KpiRow>
        <Kpi label="Employees in scope" value={k.headcount} sub={`${org.teams.length} teams · ${content.families.length} job families`} />
        <Kpi label="Conversations completed" value={percent(k.completed / k.headcount)} sub={`${k.completed} of ${k.headcount} · ${k.inProgress} in progress`} />
        <Kpi label="Ratings at the 2030 target" value={percent(k.atTargetShare)} sub="of all agreed ratings" />
        <Kpi label="Below today’s level" value={k.belowTodayPeople} sub={`of ${k.completed} assessed, in at least one competency`} />
        <Kpi label="With agreed measures" value={withMeasures} sub={`of ${k.completed} assessed employees`} />
      </KpiRow>

      <div className="grid-2-1">
        <Card title="Needs attention" aside={`${attention.length}`} flush>
          <ul className="rows">
            {attention.map((item) => (
              <li key={item.text}>
                <a className="row" href={item.href}>
                  <span className="kind">{item.kind}</span>
                  <span className="row-main">
                    <strong>{item.text}</strong>
                    <span className="sub">{item.detail}</span>
                  </span>
                  <span className="go" aria-hidden="true">
                    →
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Conversations by team" aside={<a href="#/hr/teams">All teams</a>}>
          <div className="meters">
            {coverage.map((row) => (
              <Meter key={row.team.id} name={row.team.name} value={row.completed} of={row.headcount} />
            ))}
          </div>
        </Card>
      </div>

      <Card title="Below the 2030 target" aside="Share of rated employees per job family and competency" flush>
        <FamilyHeat content={content} grid={grid} what="the 2030 target" />
        <ShareLegend />
      </Card>
    </>
  );
}

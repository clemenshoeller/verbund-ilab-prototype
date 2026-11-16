import { Kpi, KpiRow, Meter } from "../../components/Figures";
import { Card, PageHead } from "../../components/Ui";
import { useData } from "../../data";
import { MIN_GROUP, competencyStats, kpis, percent } from "../../lib/metrics";
import { go } from "../../lib/router";
import { STAGES, stageOf } from "../../lib/workflow";

export function TeamList() {
  const { content, org, assessments, assignments } = useData();
  const rows = org.teams.map((team) => {
    const members = org.employees.filter((e) => e.team === team.id);
    const k = kpis(content, members, assessments);
    return { team, k, visible: k.completed >= MIN_GROUP, measures: members.filter((e) => (assignments[e.id] ?? []).length > 0).length };
  });

  return (
    <>
      <PageHead title="Teams" sub={`${org.teams.length} teams · figures from completed conversations, hidden below ${MIN_GROUP} rated employees`} />
      <Card flush>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Team</th>
                <th>Conversations</th>
                <th className="num">At 2030 target</th>
                <th className="num">Levels missing per person</th>
                <th className="num">Below today’s level</th>
                <th className="num">With measures</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ team, k, visible, measures }) => (
                <tr
                  key={team.id}
                  className="clickable"
                  tabIndex={0}
                  onClick={() => go(`/hr/teams/${team.id}`)}
                  onKeyDown={(event) => event.key === "Enter" && go(`/hr/teams/${team.id}`)}
                >
                  <td>
                    <strong>{team.name}</strong>
                    <span className="sub">
                      {team.manager} · {k.headcount} employees
                    </span>
                  </td>
                  <td className="meter-cell">
                    <Meter name="" value={k.completed} of={k.headcount} />
                  </td>
                  <td className="num">{visible ? percent(k.atTargetShare) : `n<${MIN_GROUP}`}</td>
                  <td className="num">{visible ? (k.missingLevels / k.completed).toFixed(1) : `n<${MIN_GROUP}`}</td>
                  <td className="num">{visible ? k.belowTodayPeople : `n<${MIN_GROUP}`}</td>
                  <td className="num">{measures}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

export function TeamRecord({ teamId }: { teamId: string }) {
  const { content, org, assessments, assignments } = useData();
  const team = org.teams.find((t) => t.id === teamId);
  if (!team) return <PageHead crumbs={[{ label: "Teams", href: "#/hr/teams" }]} title="Not found" />;

  const members = org.employees.filter((e) => e.team === team.id);
  const k = kpis(content, members, assessments);
  const visible = k.completed >= MIN_GROUP;
  const stats = competencyStats(content, members, assessments).filter((s) => s.rated > 0);
  const perStage = STAGES.map((stage) => ({
    ...stage,
    count: members.filter((e) => stageOf(content, e, assessments[e.id], assignments[e.id]) === stage.id).length,
  }));
  const families = content.families
    .map((f) => ({ family: f, count: members.filter((e) => e.family === f.id).length }))
    .filter((f) => f.count > 0);

  return (
    <>
      <PageHead
        crumbs={[{ label: "Teams", href: "#/hr/teams" }, { label: team.name }]}
        title={team.name}
        sub={`${team.manager} · ${members.length} employees · ${families.map((f) => `${f.count} ${f.family.name}`).join(", ")}`}
      />

      <KpiRow>
        <Kpi label="Conversations completed" value={`${k.completed} of ${k.headcount}`} sub={`${k.inProgress} in progress`} />
        <Kpi label="Ratings at the 2030 target" value={visible ? percent(k.atTargetShare) : "–"} sub={visible ? "of all agreed ratings" : `fewer than ${MIN_GROUP} rated`} />
        <Kpi label="Levels missing to 2030" value={visible ? k.missingLevels : "–"} sub={visible && k.largestGap ? `most in “${k.largestGap.name}”` : ""} />
        <Kpi label="Below today’s level" value={visible ? k.belowTodayPeople : "–"} sub="employees, in at least one competency" />
      </KpiRow>

      <div className="grid-2-1">
        <Card title="Below the 2030 target, by competency" aside="rated employees below target">
          {visible ? (
            <div className="meters">
              {stats.map((s) => (
                <Meter key={s.competency.id} name={s.competency.name} value={s.belowTarget} of={s.rated} />
              ))}
            </div>
          ) : (
            <p className="empty">
              Fewer than {MIN_GROUP} rated employees. Results are shown once more conversations are completed.
            </p>
          )}
        </Card>

        <Card title="Stage of the team">
          <ol className="funnel">
            {perStage.map((stage) => (
              <li key={stage.id}>
                <span className="funnel-count">{stage.count}</span>
                <span>
                  <strong>{stage.name}</strong>
                  <span className="sub">{stage.hint}</span>
                </span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
      <p className="muted small">HR sees no single persons. The manager of the team sees the individual records in the manager view.</p>
    </>
  );
}

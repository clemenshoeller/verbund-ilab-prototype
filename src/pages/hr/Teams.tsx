import { Kpi, KpiRow, Meter } from "../../components/Figures";
import { Card, NotFound, PageHead } from "../../components/Ui";
import { useData } from "../../data";
import { MIN_GROUP, competencyStats, kpis } from "../../lib/metrics";
import { useUi } from "../../ui";

export function TeamList() {
  const { content, org, assessments, assignments } = useData();
  const { openDrawer } = useUi();
  const rows = org.teams.map((team) => {
    const members = org.employees.filter((e) => e.team === team.id);
    const k = kpis(content, members, assessments);
    return { team, k, visible: k.completed >= MIN_GROUP, measures: members.filter((e) => (assignments[e.id] ?? []).length > 0).length };
  });

  return (
    <>
      <PageHead title="Teams" sub={`${org.teams.length} teams · click a row for the preview`} />
      <Card flush>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Team</th>
                <th>Conversations</th>
                <th className="num">Fit for today</th>
                <th className="num">With measures</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ team, k, visible, measures }) => (
                <tr
                  key={team.id}
                  className="clickable"
                  tabIndex={0}
                  onClick={() => openDrawer({ type: "team", id: team.id })}
                  onKeyDown={(event) => event.key === "Enter" && openDrawer({ type: "team", id: team.id })}
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
                  <td className="num">{visible ? `${k.readyToday} of ${k.completed}` : `n<${MIN_GROUP}`}</td>
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
  if (!team) return <NotFound what="Team" back="#/hr/teams" backLabel="Teams" />;

  const members = org.employees.filter((e) => e.team === team.id);
  const k = kpis(content, members, assessments);
  const visible = k.completed >= MIN_GROUP;
  const stats = competencyStats(content, members, assessments).filter((s) => s.rated > 0);
  const withMeasures = members.filter((e) => (assignments[e.id] ?? []).length > 0).length;
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
        <Kpi label="Conversations done" value={`${k.completed} of ${k.headcount}`} sub={`${k.inProgress} running`} />
        <Kpi label="Fit for today" value={visible ? `${k.readyToday} of ${k.completed}` : "–"} sub={visible ? "meet today’s expectations" : `fewer than ${MIN_GROUP} rated`} />
        <Kpi label="With measures" value={withMeasures} sub="have a development plan" />
      </KpiRow>

      <Card title="Below the 2030 target, by competency" aside="rated employees below target">
        {visible ? (
          <div className="meters">
            {stats.map((s) => (
              <Meter key={s.competency.id} name={s.competency.name} value={s.belowTarget} of={s.rated} />
            ))}
          </div>
        ) : (
          <p className="empty">Fewer than {MIN_GROUP} rated employees. Results are shown once more conversations are completed.</p>
        )}
      </Card>
      <p className="muted small">HR sees no single persons. The manager of the team sees the individual records in the manager view.</p>
    </>
  );
}

import { Icon } from "../../components/Icon";
import { Steps, StepsLegend } from "../../components/Steps";
import { Avatar, Card, PageHead, StageChip, formatDate } from "../../components/Ui";
import { useData } from "../../data";
import { recentActivity } from "../../lib/activity";
import { gapRows } from "../../lib/gap";
import { kpis } from "../../lib/metrics";
import { STAGES, nextActions, stageOf } from "../../lib/workflow";
import { useUi } from "../../ui";

/** One clickable figure of the dashboard; it leads to the list behind the number. */
function Stat({ label, value, sub, href }: { label: string; value: string | number; sub: string; href: string }) {
  return (
    <a className="stat" href={href}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      <span className="stat-sub">{sub}</span>
      <span className="stat-go" aria-hidden="true">
        <Icon name="right" size={16} />
      </span>
    </a>
  );
}

export function TeamHome() {
  const { content, team, assessments, assignments } = useData();
  const { openDrawer } = useUi();
  const k = kpis(content, team.employees, assessments);
  const actions = nextActions(content, team.employees, assessments, assignments);
  const activity = recentActivity(content, team.employees, assessments, assignments, 5);
  const stages = STAGES.map((stage) => ({
    ...stage,
    people: team.employees.filter((e) => stageOf(content, e, assessments[e.id], assignments[e.id]) === stage.id),
  }));
  const running = team.employees.reduce((n, e) => n + (assignments[e.id] ?? []).filter((a) => a.status !== "done").length, 0);
  // Only the competencies someone in this team needs.
  const columns = content.competencies.filter((c) => team.employees.some((e) => (content.families.find((f) => f.id === e.family)?.profile[c.id]?.target ?? 0) > 0));

  const headline =
    k.completed === 0 ? "No conversation is completed yet." : k.completed === k.headcount ? "All conversations are done." : `${k.completed} of ${k.headcount} conversations are done.`;
  const where =
    k.completed === 0
      ? `${team.info.name} · ${team.employees.length} team members`
      : `${k.readyToday} of ${k.completed} assessed team members meet today’s expectations` + (k.largestGap ? `; most steps to 2030 are in “${k.largestGap.name}”.` : ".");

  return (
    <>
      <PageHead
        title={headline}
        sub={where}
        actions={
          actions[0] && (
            <a className="btn" href={actions[0].href}>
              {actions[0].label} with {actions[0].employee.name.split(" ")[0]}
            </a>
          )
        }
      />

      <div className="stats">
        <Stat label="Conversations done" value={`${k.completed} / ${k.headcount}`} sub={k.inProgress ? `${k.inProgress} running` : "none running"} href="#/team/pipeline" />
        <Stat label="Fit for today" value={k.completed ? `${k.readyToday} / ${k.completed}` : "–"} sub="meet today’s expectations" href="#/team/people" />
        <Stat label="Next steps" value={actions.length} sub={actions.length ? "waiting for you" : "nothing open"} href="#/team/people" />
        <Stat label="Measures in progress" value={running} sub="planned or running" href="#/team/people?stage=planned" />
      </div>

      <div className="grid-2-1">
        <Card title="Your next steps" aside={actions.length ? `${actions.length} open` : undefined} flush>
          {actions.length === 0 ? (
            <p className="empty">Nothing open. All conversations are completed and measures agreed.</p>
          ) : (
            <ul className="rows">
              {actions.map((action) => (
                <li key={action.employee.id}>
                  <a href={action.href} className="row">
                    <Avatar name={action.employee.name} />
                    <span className="row-main">
                      <strong>
                        {action.label} with {action.employee.name}
                      </strong>
                      <span className="sub">
                        {action.employee.role} · {action.detail}
                      </span>
                    </span>
                    <StageChip stage={action.stage} />
                    <span className="go" aria-hidden="true">
                      <Icon name="right" size={16} />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="col">
        <Card title="Pipeline" aside={<a href="#/team/pipeline">Open board</a>} flush>
          <ul className="rows">
            {stages.map((stage) => (
              <li key={stage.id}>
                <a className="row" href={`#/team/people?stage=${stage.id}`}>
                  <span className="funnel-count">{stage.people.length}</span>
                  <span className="row-main">
                    <strong>{stage.name}</strong>
                    <span className="sub">{stage.hint}</span>
                  </span>
                  <span className="stack">
                    {stage.people.slice(0, 4).map((p) => (
                      <Avatar key={p.id} name={p.name} small />
                    ))}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Recent activity" flush>
          {activity.length === 0 ? (
            <p className="empty">Nothing recorded yet.</p>
          ) : (
            <ul className="rows">
              {activity.map((event, i) => (
                <li key={i}>
                  <a className="row" href={event.href}>
                    <Avatar name={event.employee.name} small />
                    <span className="row-main">
                      <strong>{event.employee.name}</strong>
                      <span className="sub">{event.text}</span>
                    </span>
                    <span className="when">{formatDate(event.date).slice(0, 6)}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>
        </div>
      </div>

      <div className="col">
        <Card title="Your team at a glance" aside="Click a row for the preview" flush>
          <div className="table-wrap">
            <table className="table matrix">
              <thead>
                <tr>
                  <th>Team member</th>
                  {columns.map((c) => (
                    <th key={c.id} title={c.description}>
                      {c.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {team.employees.map((employee) => {
                  const family = content.families.find((f) => f.id === employee.family)!;
                  const rows = gapRows(content, family, assessments[employee.id]);
                  return (
                    <tr
                      key={employee.id}
                      className="clickable"
                      tabIndex={0}
                      onClick={() => openDrawer({ type: "person", id: employee.id })}
                      onKeyDown={(event) => event.key === "Enter" && openDrawer({ type: "person", id: employee.id })}
                    >
                      <td>
                        <strong>{employee.name}</strong>
                        <span className="sub">{employee.role}</span>
                      </td>
                      {columns.map((c) => {
                        const row = rows.find((r) => r.competency.id === c.id);
                        return <td key={c.id}>{row ? <Steps value={row.agreed} target={row.target} levels={content.levels} compact /> : <span className="muted">–</span>}</td>;
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="card-note">
            <StepsLegend />
          </div>
        </Card>

      </div>
    </>
  );
}

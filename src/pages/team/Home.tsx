import { Steps, StepsLegend } from "../../components/Steps";
import { Avatar, Card, PageHead, StageChip } from "../../components/Ui";
import { useData } from "../../data";
import { gapRows } from "../../lib/gap";
import { kpis } from "../../lib/metrics";
import { go } from "../../lib/router";
import { nextActions } from "../../lib/workflow";

export function TeamHome() {
  const { content, team, assessments, assignments } = useData();
  const k = kpis(content, team.employees, assessments);
  const actions = nextActions(content, team.employees, assessments, assignments);
  // Only the competencies someone in this team needs, so the matrix has no empty columns for most teams.
  const columns = content.competencies.filter((c) => team.employees.some((e) => (content.families.find((f) => f.id === e.family)?.profile[c.id]?.target ?? 0) > 0));

  const headline =
    k.completed === 0
      ? "No conversation is completed yet."
      : k.completed === k.headcount
        ? "All conversations are done."
        : `${k.completed} of ${k.headcount} conversations are done.`;
  const where =
    k.completed === 0
      ? `${team.info.name} · ${team.employees.length} team members`
      : `${k.readyToday} of ${k.completed} assessed team members meet today’s expectations` +
        (k.largestGap ? `; most steps to 2030 are in “${k.largestGap.name}”.` : ".");

  return (
    <>
      <PageHead title={headline} sub={where} />

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
                    →
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Your team at a glance" aside="Agreed level and 2030 target per competency" flush>
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
                  <tr key={employee.id} className="clickable" tabIndex={0} onClick={() => go(`/team/people/${employee.id}`)} onKeyDown={(event) => event.key === "Enter" && go(`/team/people/${employee.id}`)}>
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
    </>
  );
}

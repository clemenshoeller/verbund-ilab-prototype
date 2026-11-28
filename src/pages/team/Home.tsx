import { Icon } from "../../components/Icon";
import { KpiTile, Tiles } from "../../components/KpiTile";
import { Steps, StepsLegend } from "../../components/Steps";
import { Avatar, Card, PageHead, StageChip } from "../../components/Ui";
import { useData } from "../../data";
import { familyOf, gapRows } from "../../lib/gap";
import { kpis } from "../../lib/metrics";
import { nextActions } from "../../lib/workflow";
import { useUi } from "../../ui";

/** Manager dashboard: where the team stands, what to do next, and the team at a glance. */
export function TeamHome() {
  const { content, team, assessments, assignments } = useData();
  const { openDrawer } = useUi();
  const k = kpis(content, team.employees, assessments);
  const actions = nextActions(content, team.employees, assessments, assignments);
  const withMeasures = team.employees.filter((e) => assessments[e.id]?.status === "completed" && (assignments[e.id] ?? []).length > 0).length;
  // Only the competencies someone in this team needs.
  const columns = content.competencies.filter((c) => team.employees.some((e) => (familyOf(content, e)?.profile[c.id]?.target ?? 0) > 0));

  // Per competency: who in the team has reached the 2030 target. A skill held by one person is fragile.
  const holders = columns.map((c) => {
    const rated = team.employees.flatMap((e) => {
      const target = familyOf(content, e)?.profile[c.id]?.target ?? 0;
      const agreed = assessments[e.id]?.ratings[c.id]?.agreed ?? null;
      return target > 0 && agreed !== null ? [{ employee: e, reached: agreed >= target }] : [];
    });
    return { id: c.id, rated: rated.length, reached: rated.filter((r) => r.reached).map((r) => r.employee) };
  });

  const headline =
    k.completed === 0 ? "No conversation is completed yet." : k.completed === k.headcount ? "All conversations are done." : `${k.completed} of ${k.headcount} conversations are done.`;

  return (
    <>
      <PageHead
        title={headline}
        sub={`${team.info.name} · ${team.employees.length} team members`}
        actions={
          actions[0] && (
            <a className="btn" href={actions[0].href}>
              {actions[0].label} with {actions[0].employee.name.split(" ")[0]}
            </a>
          )
        }
      />

      <Tiles>
        <KpiTile icon="people" label="Conversations done" value={k.completed} unit={` of ${k.headcount}`} sub={k.inProgress ? `${k.inProgress} running` : "none running"} dots={{ done: k.completed, total: k.headcount }} href="#/team/pipeline" />
        <KpiTile
          icon="shield"
          label="Fit for today"
          value={k.readyToday}
          unit={` of ${k.completed}`}
          sub="assessed, meet today’s expectations"
          dots={{ done: k.readyToday, total: k.completed }}
          href="#/team/people"
        />
        <KpiTile
          icon="measure"
          label="Measures agreed"
          value={withMeasures}
          unit={` of ${k.completed}`}
          sub="assessed, have a development plan"
          dots={{ done: withMeasures, total: k.completed }}
          href="#/team/people?stage=planned"
        />
      </Tiles>

      <Card title="Your next steps" aside={actions.length > 3 ? <a href="#/team/pipeline">All {actions.length} on the team board</a> : undefined} flush>
        {actions.length === 0 ? (
          <p className="empty">Nothing open. All conversations are completed and measures agreed.</p>
        ) : (
          <ul className="rows">
            {actions.slice(0, 3).map((action) => (
              <li key={action.employee.id}>
                <a href={action.href} className="row">
                  <Avatar name={action.employee.name} />
                  <span className="row-main">
                    <strong>
                      {action.label} with {action.employee.name}
                    </strong>
                    <span className="sub">{action.detail}</span>
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
                const family = familyOf(content, employee)!;
                const rows = gapRows(content, family, assessments[employee.id]);
                return (
                  <tr key={employee.id} className="clickable" onClick={() => openDrawer({ type: "person", id: employee.id })}>
                    <td>
                      <button
                      type="button"
                      className="rowlink"
                      onClick={(event) => {
                        event.stopPropagation();
                        openDrawer({ type: "person", id: employee.id });
                      }}
                    >
                      {employee.name}
                    </button>
                    </td>
                    {columns.map((c) => {
                      const row = rows.find((r) => r.competency.id === c.id);
                      return <td key={c.id}>{row ? <Steps value={row.agreed} target={row.target} levels={content.levels} compact /> : <span className="muted">–</span>}</td>;
                    })}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" title="Members who have reached the 2030 target and can pass it on">
                  Can help others
                </th>
                {holders.map((h) => {
                  const names = h.reached.map((e) => e.name.split(" ")[0]);
                  return (
                    <td key={h.id}>
                      {h.rated === 0 ? (
                        <span className="muted">–</span>
                      ) : names.length === 0 ? (
                        <span className="muted">Nobody yet</span>
                      ) : (
                        <span className="holders">
                          {names.length > 2 ? `${names.slice(0, 2).join(", ")} +${names.length - 2}` : names.join(", ")}
                          {names.length === 1 && <span className="holders-one">only one</span>}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="card-note">
          <StepsLegend />
        </div>
      </Card>
    </>
  );
}

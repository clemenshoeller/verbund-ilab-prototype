import { Kpi, KpiRow } from "../../components/Figures";
import { Avatar, Card, PageHead, StageChip } from "../../components/Ui";
import { useData } from "../../data";
import { kpis, percent } from "../../lib/metrics";
import { STAGES, nextActions, stageOf } from "../../lib/workflow";

export function TeamHome() {
  const { content, team, assessments, assignments } = useData();
  const k = kpis(content, team.employees, assessments);
  const actions = nextActions(content, team.employees, assessments, assignments);
  const perStage = STAGES.map((stage) => ({
    ...stage,
    count: team.employees.filter((e) => stageOf(content, e, assessments[e.id], assignments[e.id]) === stage.id).length,
  }));

  return (
    <>
      <PageHead
        title={`Welcome, ${team.info.manager}`}
        sub={`${team.info.name} · ${team.employees.length} team members · ${actions.length} open ${actions.length === 1 ? "step" : "steps"}`}
        actions={
          <a className="btn" href="#/team/pipeline">
            Open pipeline
          </a>
        }
      />

      <KpiRow>
        <Kpi
          label="Conversations completed"
          value={`${k.completed} of ${k.headcount}`}
          sub={k.inProgress ? `${k.inProgress} in progress` : "none in progress"}
        />
        <Kpi label="Ratings at the 2030 target" value={percent(k.atTargetShare)} sub="of all agreed ratings" />
        <Kpi label="Levels missing to 2030" value={k.missingLevels} sub={k.largestGap ? `most in “${k.largestGap.name}”` : "no gap so far"} />
        <Kpi label="Below today’s level" value={k.belowTodayPeople} sub="team members, in at least one competency" />
      </KpiRow>

      <div className="grid-2-1">
        <Card title="Next steps" aside={`${actions.length} open`} flush>
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

        <Card title="Where the team stands" aside={<a href="#/team/pipeline">Pipeline</a>}>
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
    </>
  );
}

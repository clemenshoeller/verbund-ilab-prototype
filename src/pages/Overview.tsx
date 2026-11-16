import { Kpi, KpiRow } from "../components/Figures";
import { StatusChip } from "../components/Level";
import { agreedCount, gapRows, statusOf, totalGap } from "../lib/gap";
import { kpis, percent } from "../lib/metrics";
import type { Assessments, Content, Employee, TeamInfo } from "../types";

const STEPS = [
  { n: 1, title: "Target profile", text: "See which AI competencies the job family needs today and in 2030.", href: "#/team/profiles" },
  { n: 2, title: "Competency conversation", text: "Manager and employee rate each competency and agree on a level.", href: "#/team/assess" },
  { n: 3, title: "Gaps and measures", text: "Compare the agreed level with the 2030 target and pick measures.", href: "#/team/gaps" },
];

export function Overview({
  content,
  team,
  employees,
  assessments,
}: {
  content: Content;
  team: TeamInfo;
  employees: Employee[];
  assessments: Assessments;
}) {
  const k = kpis(content, employees, assessments);

  return (
    <>
      <section className="hero">
        <p className="eyebrow">Team view · {team.name}</p>
        <h1>Where does my team stand on AI, and where does it need to be in 2030?</h1>
        <p className="lead">
          A structured conversation with each team member shows the gap to the target profile of the job family.
        </p>
      </section>

      <KpiRow>
        <Kpi
          label="Conversations completed"
          value={`${k.completed} of ${k.headcount}`}
          sub={k.inProgress ? `${k.inProgress} in progress` : "none in progress"}
        />
        <Kpi label="Ratings at the 2030 target" value={percent(k.atTargetShare)} sub="of all agreed ratings" />
        <Kpi
          label="Levels missing to 2030"
          value={k.missingLevels}
          sub={k.largestGap ? `most in “${k.largestGap.name}”` : "no gap so far"}
        />
        <Kpi label="Below today’s level" value={k.belowTodayPeople} sub="team members, in at least one competency" />
      </KpiRow>

      <section className="steps" aria-label="How it works">
        {STEPS.map((step) => (
          <a key={step.n} className="step" href={step.href}>
            <span className="step-n">{step.n}</span>
            <span>
              <strong>{step.title}</strong>
              <span className="step-text">{step.text}</span>
            </span>
          </a>
        ))}
      </section>

      <section>
        <div className="section-head">
          <h2>My team</h2>
          <p className="muted">{employees.length} team members</p>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Job family</th>
                <th>Status</th>
                <th className="num">Levels missing to 2030</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => {
                const family = content.families.find((f) => f.id === employee.family)!;
                const assessment = assessments[employee.id];
                const status = statusOf(assessment);
                const rows = gapRows(content, family, assessment);
                const total = totalGap(rows);
                return (
                  <tr key={employee.id}>
                    <td>
                      <strong>{employee.name}</strong>
                      <span className="sub">{employee.role}</span>
                    </td>
                    <td>{family.name}</td>
                    <td>
                      <StatusChip status={status} />
                      {status === "in-progress" && (
                        <span className="sub">
                          {agreedCount(rows)} of {rows.length} agreed
                        </span>
                      )}
                    </td>
                    <td className="num">{status === "completed" && total !== null ? total : "–"}</td>
                    <td className="actions">
                      {status === "completed" ? (
                        <a className="btn ghost" href={`#/team/gaps/${employee.id}`}>
                          View gaps
                        </a>
                      ) : (
                        <a className="btn" href={`#/team/assess/${employee.id}`}>
                          {status === "open" ? "Start conversation" : "Continue"}
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

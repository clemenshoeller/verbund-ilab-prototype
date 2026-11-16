import { StatusChip } from "../components/Level";
import { agreedCount, gapRows, statusOf, totalGap } from "../lib/gap";
import type { Assessment, Content, Team } from "../types";

const STEPS = [
  { n: 1, title: "Target profile", text: "See which AI competencies the job family needs today and in 2030.", href: "#/profiles" },
  { n: 2, title: "Competency conversation", text: "Manager and employee rate each competency and agree on a level.", href: "#/assess" },
  { n: 3, title: "Gaps and measures", text: "Compare the agreed level with the 2030 target and pick measures.", href: "#/gaps" },
];

export function Overview({
  content,
  team,
  assessments,
}: {
  content: Content;
  team: Team;
  assessments: Record<string, Assessment>;
}) {
  const done = team.employees.filter((e) => statusOf(assessments[e.id]) === "completed").length;

  return (
    <>
      <section className="hero">
        <p className="eyebrow">Tool concept for managers</p>
        <h1>Where does my team stand on AI, and where does it need to be in 2030?</h1>
        <p className="lead">
          The AI Competency Check guides a manager through a structured conversation with each team member and shows
          the gap to the target profile of the job family.
        </p>
      </section>

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
          <p className="muted">
            {team.manager.unit} · {done} of {team.employees.length} conversations completed
          </p>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Job family</th>
                <th>Status</th>
                <th className="num">Open levels to 2030</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {team.employees.map((employee) => {
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
                        <a className="btn ghost" href={`#/gaps/${employee.id}`}>
                          View gaps
                        </a>
                      ) : (
                        <a className="btn" href={`#/assess/${employee.id}`}>
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

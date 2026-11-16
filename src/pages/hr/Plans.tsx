import { DraftTag } from "../../components/Figures";
import { isCompleted, measureReach } from "../../lib/metrics";
import type { Assessments, Content, Org } from "../../types";

export function HrMeasures({ content, org, assessments }: { content: Content; org: Org; assessments: Assessments }) {
  const assessed = org.employees.filter((e) => isCompleted(assessments, e.id)).length;
  const name = (id: string) => content.competencies.find((c) => c.id === id)?.name ?? id;

  return (
    <>
      <div className="page-head">
        <p className="eyebrow">HR view · measures</p>
        <h1>
          Types of measures <DraftTag />
        </h1>
        <p className="lead">
          Which kind of measure fits which gap. General level, no training design and no individual learning paths.
        </p>
      </div>

      {content.measureTypes.map((type) => {
        const measures = content.measures.filter((m) => m.type === type.id);
        if (measures.length === 0) return null;
        return (
          <section key={type.id}>
            <div className="section-head">
              <h2>{type.name}</h2>
              <p className="muted">{type.short}</p>
            </div>
            <div className="cards wide">
              {measures.map((measure) => {
                const reach = measureReach(content, org.employees, assessments, measure);
                return (
                  <article key={measure.id} className="card measure">
                    <strong>{measure.title}</strong>
                    <p className="muted">{measure.description}</p>
                    <p className="tags">
                      {measure.competencies.map((id) => (
                        <span key={id} className="chip">
                          {name(id)}
                        </span>
                      ))}
                    </p>
                    <p className="reach">
                      <strong>{reach}</strong> of {assessed} assessed employees have a gap to 2030 here
                    </p>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}

export function HrRoadmap({ content }: { content: Content }) {
  return (
    <>
      <div className="page-head">
        <p className="eyebrow">HR view · roadmap</p>
        <h1>
          Roadmap to 2030 <DraftTag />
        </h1>
        <p className="lead">From the first profiles to a yearly routine. Phases and contents are a first proposal.</p>
      </div>

      <ol className="roadmap">
        {content.roadmap.map((phase) => (
          <li key={phase.period} className={phase.current ? "current" : ""}>
            <span className="period">{phase.period}</span>
            <h2>{phase.title}</h2>
            {phase.current && <span className="chip completed">We are here</span>}
            <ul>
              {phase.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </>
  );
}

export function HrGovernance({ content }: { content: Content }) {
  const { roles, cycle, rules } = content.governance;
  return (
    <>
      <div className="page-head">
        <p className="eyebrow">HR view · governance</p>
        <h1>
          Who keeps the profiles up to date <DraftTag />
        </h1>
        <p className="lead">Owners, a yearly review cycle and rules for the data. A first proposal, to be agreed with VERBUND.</p>
      </div>

      <section>
        <h2 className="group-title">Yearly cycle</h2>
        <ol className="cycle">
          {cycle.map((step) => (
            <li key={step.when}>
              <span className="period">{step.when}</span>
              <strong>{step.what}</strong>
              <span className="sub">{step.detail}</span>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="group-title">Roles</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Who</th>
                <th>Tasks</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((row) => (
                <tr key={row.role}>
                  <td>
                    <strong>{row.role}</strong>
                  </td>
                  <td>{row.who}</td>
                  <td>{row.tasks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h2>Rules for the data</h2>
        <ul className="rules">
          {rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </section>
    </>
  );
}

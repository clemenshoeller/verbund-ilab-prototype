import { DraftTag, Meter } from "../../components/Figures";
import { Card, PageHead } from "../../components/Ui";
import { useData } from "../../data";
import { measureReach } from "../../lib/metrics";
import { go } from "../../lib/router";
import { measureUptake } from "../../lib/workflow";

export function HrMeasures({ typeId }: { typeId?: string }) {
  const { content, org, assessments, assignments } = useData();
  const type = content.measureTypes.find((t) => t.id === typeId);
  const name = (id: string) => content.competencies.find((c) => c.id === id)?.name ?? id;
  const typeName = (id: string) => content.measureTypes.find((t) => t.id === id)?.name ?? id;
  const perPerson = (id: string) => content.measureTypes.find((t) => t.id === id)?.perPerson ?? true;
  const rows = content.measures
    .filter((m) => !type || m.type === type.id)
    .map((m) => ({ m, reach: measureReach(content, org.employees, assessments, m), ...measureUptake(org.employees, assignments, m.id) }));

  return (
    <>
      <PageHead
        title={
          <>
            Measures <DraftTag />
          </>
        }
        sub="Catalogue of measure types and how far each is in use. General level, no training design and no individual learning paths."
      />

      <Card
        title={type ? type.name : "All measures"}
        aside={
          <span className="tabs" role="tablist" aria-label="Type of measure">
            <button type="button" role="tab" aria-selected={!type} className={"tab" + (!type ? " on" : "")} onClick={() => go("/hr/measures")}>
              All
            </button>
            {content.measureTypes.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={t.id === type?.id} className={"tab" + (t.id === type?.id ? " on" : "")} onClick={() => go(`/hr/measures/${t.id}`)} title={t.short}>
                {t.name}
              </button>
            ))}
          </span>
        }
        flush
      >
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Measure</th>
                <th>Type</th>
                <th>Builds</th>
                <th>Agreed, of employees with a fitting gap</th>
                <th className="num">Done</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ m, reach, assigned, done }) => (
                <tr key={m.id}>
                  <td>
                    <strong>{m.title}</strong>
                    <span className="sub">{m.description}</span>
                  </td>
                  <td>
                    <span className="kind">{typeName(m.type)}</span>
                  </td>
                  <td>
                    <span className="tags">
                      {m.competencies.map((id) => (
                        <a key={id} className="chip" href={`#/hr/competencies/${id}`}>
                          {name(id)}
                        </a>
                      ))}
                    </span>
                  </td>
                  <td className="meter-cell">
                    {perPerson(m.type) ? (
                      <Meter name="" value={Math.min(assigned, reach)} of={reach} />
                    ) : (
                      <span className="sub">For the organisation · {reach} employees with a fitting gap</span>
                    )}
                  </td>
                  <td className="num">{perPerson(m.type) ? done : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

export function HrRoadmap() {
  const { content } = useData();
  return (
    <>
      <PageHead
        title={
          <>
            Roadmap to 2030 <DraftTag />
          </>
        }
        sub="From the first profiles to a yearly routine. Phases and contents are a first proposal."
      />
      <Card>
        <ol className="roadmap">
          {content.roadmap.map((phase) => (
            <li key={phase.period} className={phase.current ? "current" : ""}>
              <span className="period">{phase.period}</span>
              <h2>{phase.title}</h2>
              {phase.current && <span className="chip stage-planned">We are here</span>}
              <ul>
                {phase.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </Card>
    </>
  );
}

export function HrGovernance() {
  const { content } = useData();
  const { roles, cycle, rules } = content.governance;
  return (
    <>
      <PageHead
        title={
          <>
            Governance <DraftTag />
          </>
        }
        sub="Who keeps the profiles up to date: owners, a yearly review cycle and rules for the data. A first proposal, to be agreed with VERBUND."
      />

      <Card title="Yearly cycle">
        <ol className="cycle">
          {cycle.map((step) => (
            <li key={step.when}>
              <span className="period">{step.when}</span>
              <strong>{step.what}</strong>
              <span className="sub">{step.detail}</span>
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid-2-1">
        <Card title="Roles" flush>
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
        </Card>
        <Card title="Rules for the data">
          <ul className="rules">
            {rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}

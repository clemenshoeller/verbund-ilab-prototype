import type { ReactNode } from "react";
import { Meter } from "../../components/Figures";
import { Icon } from "../../components/Icon";
import { Card, PageHead } from "../../components/Ui";
import { useData } from "../../data";
import { MIN_GROUP, kpis, measureReach, percent, priorities, teamCoverage } from "../../lib/metrics";
import { measureUptake } from "../../lib/workflow";
import { useUi } from "../../ui";

interface Attention {
  text: string;
  detail: string;
  kind: string;
  open: () => void;
}

/** One question, one figure against its whole, one sentence, one way into the detail. */
function Answer({ question, value, of, figure, children, href, link }: { question: string; value: number; of: number; figure: string; children: ReactNode; href: string; link: string }) {
  return (
    <a className="answer" href={href}>
      <span className="eyebrow">{question}</span>
      <span className="answer-figure">{figure}</span>
      <Meter name="" value={value} of={of} />
      <span className="answer-text">{children}</span>
      <span className="answer-link">
        {link} <Icon name="right" size={16} />
      </span>
    </a>
  );
}

export function HrHome() {
  const { content, org, assessments, assignments } = useData();
  const { openDrawer } = useUi();
  const k = kpis(content, org.employees, assessments);
  const ranked = priorities(content, org.employees, assessments);
  const top = ranked[0];
  const coverage = teamCoverage(org, assessments);
  const withMeasures = org.employees.filter((e) => (assignments[e.id] ?? []).length > 0).length;
  const families = content.families.map((family) => {
    const members = org.employees.filter((e) => e.family === family.id);
    return { family, k: kpis(content, members, assessments) };
  });
  const measures = content.measures
    .filter((m) => content.measureTypes.find((t) => t.id === m.type)?.perPerson)
    .map((m) => ({ m, reach: measureReach(content, org.employees, assessments, m), ...measureUptake(org.employees, assignments, m.id) }))
    .filter((x) => x.reach > 0)
    .sort((a, b) => b.assigned - a.assigned);

  // What HR should look at first: slow teams, urgent gaps, a measure that is hardly used.
  const attention: Attention[] = [];
  for (const row of coverage.filter((c) => c.completed / c.headcount < 0.5).reverse()) {
    attention.push({
      kind: "Team",
      text: row.team.name,
      detail: `${row.completed} of ${row.headcount} conversations done, less than half`,
      open: () => openDrawer({ type: "team", id: row.team.id }),
    });
  }
  for (const row of ranked.filter((p) => p.belowToday > 0).slice(0, 2)) {
    attention.push({
      kind: "Gap",
      text: `${row.competency.name} in ${row.family.name}`,
      detail: `${row.belowToday} of ${row.assessed} are below today’s expectation`,
      open: () => openDrawer({ type: "cell", familyId: row.family.id, competencyId: row.competency.id }),
    });
  }
  const unused = [...measures].sort((a, b) => a.assigned / a.reach - b.assigned / b.reach)[0];
  if (unused) {
    attention.push({
      kind: "Measure",
      text: unused.m.title,
      detail: `Least used measure: agreed for ${unused.assigned} of ${unused.reach} it would fit`,
      open: () => openDrawer({ type: "competency", id: unused.m.competencies[0] }),
    });
  }

  return (
    <>
      <PageHead
        title={`${k.readyToday} of ${k.completed} assessed employees meet today’s AI expectations.`}
        sub={`From ${k.completed} completed conversations in ${org.teams.length} teams. Totals only, no single persons; groups under ${MIN_GROUP} stay hidden.`}
      />

      <div className="answers">
        <Answer question="Are we fit for today?" figure={percent(k.completed ? k.readyToday / k.completed : null)} value={k.readyToday} of={k.completed} href="#/hr/gaps/baseline" link="Where not">
          {k.belowTodayPeople} employees are below today’s expectation in at least one competency.
        </Answer>
        <Answer question="Are we on the way to 2030?" figure={percent(k.atTargetShare)} value={Math.round((k.atTargetShare ?? 0) * 100)} of={100} href="#/hr/gaps/target" link="All gaps">
          of all agreed levels already meet the 2030 target.{top ? ` The largest gap: “${top.competency.name}” in ${top.family.name}.` : ""}
        </Answer>
        <Answer question="Is it moving?" figure={percent(k.completed / k.headcount)} value={k.completed} of={k.headcount} href="#/hr/teams" link="By team">
          of the conversations are done. {withMeasures} of {k.completed} assessed employees have agreed measures.
        </Answer>
      </div>

      <div className="grid-3">
        <Card title="Needs attention" aside={`${attention.length}`} flush>
          <ul className="rows">
            {attention.map((item) => (
              <li key={item.text}>
                <button type="button" className="row" onClick={item.open}>
                  <span className="kind">{item.kind}</span>
                  <span className="row-main">
                    <strong>{item.text}</strong>
                    <span className="sub">{item.detail}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Fit for today, by job family" aside={<a href="#/hr/profiles">Job families</a>}>
          <div className="meters">
            {families.map(({ family, k: fk }) =>
              fk.completed >= MIN_GROUP ? (
                <a key={family.id} className="meter-link" href={`#/hr/profiles/${family.id}`}>
                  <Meter name={family.name} value={fk.readyToday} of={fk.completed} />
                </a>
              ) : (
                <p key={family.id} className="muted small">
                  {family.name}: fewer than {MIN_GROUP} assessed
                </p>
              ),
            )}
          </div>
        </Card>

        <Card title="Conversations by team" aside={<a href="#/hr/teams">All teams</a>}>
          <div className="meters">
            {coverage.map((row) => (
              <button key={row.team.id} type="button" className="meter-link" onClick={() => openDrawer({ type: "team", id: row.team.id })}>
                <Meter name={row.team.name} value={row.completed} of={row.headcount} />
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid-1-1">
        <Card title="Largest gaps" aside={<a href="#/hr/gaps">Gap analysis</a>} flush>
          <ul className="rows">
            {ranked.slice(0, 5).map((row, i) => (
              <li key={row.family.id + row.competency.id}>
                <button type="button" className="row" onClick={() => openDrawer({ type: "cell", familyId: row.family.id, competencyId: row.competency.id })}>
                  <span className="rank">{i + 1}</span>
                  <span className="row-main">
                    <strong>{row.competency.name}</strong>
                    <span className="sub">{row.family.name}</span>
                  </span>
                  <span className="row-figure">
                    <strong>{row.belowToday}</strong> below today
                    <span className="sub">{row.belowTarget} below 2030 target</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Measures in use" aside={<a href="#/hr/measures">All measures</a>} flush>
          <ul className="rows">
            {measures.slice(0, 5).map(({ m, reach, assigned }) => (
              <li key={m.id}>
                <a className="row" href="#/hr/measures">
                  <span className="row-main">
                    <strong>{m.title}</strong>
                    <Meter name="" value={Math.min(assigned, reach)} of={reach} />
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}

import { Meter } from "../../components/Figures";
import { Card, PageHead } from "../../components/Ui";
import { useData } from "../../data";
import { MIN_GROUP, kpis, measureReach, percent, priorities, teamCoverage } from "../../lib/metrics";
import { measureUptake } from "../../lib/workflow";
import type { ReactNode } from "react";

interface Attention {
  text: string;
  detail: string;
  href: string;
  kind: string;
}

/** One question, one figure against its whole, one sentence, one way into the detail. */
function Answer({ question, value, of, figure, children, href, link }: { question: string; value: number; of: number; figure: string; children: ReactNode; href: string; link: string }) {
  return (
    <section className="answer">
      <p className="eyebrow">{question}</p>
      <p className="answer-figure">{figure}</p>
      <Meter name="" value={value} of={of} />
      <p className="answer-text">{children}</p>
      <a href={href}>{link} →</a>
    </section>
  );
}

export function HrHome() {
  const { content, org, assessments, assignments } = useData();
  const k = kpis(content, org.employees, assessments);
  const ranked = priorities(content, org.employees, assessments);
  const top = ranked[0];
  const withMeasures = org.employees.filter((e) => (assignments[e.id] ?? []).length > 0).length;
  const families = content.families.map((family) => {
    const members = org.employees.filter((e) => e.family === family.id);
    return { family, k: kpis(content, members, assessments) };
  });

  // What HR should look at first: slow teams, urgent gaps, measures that are hardly used.
  const attention: Attention[] = [];
  for (const row of teamCoverage(org, assessments).filter((c) => c.completed / c.headcount < 0.5).reverse()) {
    attention.push({
      kind: "Team",
      text: `${row.team.name}: ${row.completed} of ${row.headcount} conversations done`,
      detail: "Less than half of the team has been assessed",
      href: `#/hr/teams/${row.team.id}`,
    });
  }
  for (const row of ranked.filter((p) => p.belowToday > 0).slice(0, 2)) {
    attention.push({
      kind: "Gap",
      text: `${row.belowToday} of ${row.assessed} in ${row.family.name} are below today’s expectation in “${row.competency.name}”`,
      detail: "Basic training is the first measure here",
      href: `#/hr/competencies/${row.competency.id}`,
    });
  }
  const unused = content.measures
    .map((m) => ({ m, reach: measureReach(content, org.employees, assessments, m), used: measureUptake(org.employees, assignments, m.id).assigned }))
    .filter((x) => x.reach > 0 && content.measureTypes.find((t) => t.id === x.m.type)?.perPerson)
    .sort((a, b) => a.used / a.reach - b.used / b.reach)[0];
  if (unused) {
    attention.push({
      kind: "Measure",
      text: `“${unused.m.title}” is agreed for ${unused.used} of ${unused.reach} employees it would fit`,
      detail: "Least used measure",
      href: "#/hr/measures",
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

      <div className="grid-1-1">
        <Card title="Fit for today, by job family" aside="assessed employees who meet today’s expectations">
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

        <Card title="Needs attention" aside={`${attention.length}`} flush>
          <ul className="rows">
            {attention.map((item) => (
              <li key={item.text}>
                <a className="row" href={item.href}>
                  <span className="kind">{item.kind}</span>
                  <span className="row-main">
                    <strong>{item.text}</strong>
                    <span className="sub">{item.detail}</span>
                  </span>
                  <span className="go" aria-hidden="true">
                    →
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

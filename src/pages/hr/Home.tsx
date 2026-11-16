import { KpiTile, Tiles, change } from "../../components/KpiTile";
import { Card, PageHead } from "../../components/Ui";
import { useData } from "../../data";
import { MIN_GROUP, kpiHistory, kpis, priorities, teamCoverage } from "../../lib/metrics";
import { useUi } from "../../ui";

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

/** HR dashboard: three figures that answer the three questions, and the few things to look at next. */
export function HrHome() {
  const { content, org, assessments } = useData();
  const { openDrawer } = useUi();
  const k = kpis(content, org.employees, assessments);
  // The trend starts once enough people are assessed for a share to mean something.
  const history = kpiHistory(content, org.employees, assessments).filter((h) => h.completed >= MIN_GROUP);
  const before = history[Math.max(0, history.length - 5)] ?? k;
  const ranked = priorities(content, org.employees, assessments);
  const slow = teamCoverage(org, assessments)
    .filter((c) => c.completed / c.headcount < 0.5)
    .reverse();

  const fit = pct(k.readyToday, k.completed);
  const target = Math.round((k.atTargetShare ?? 0) * 100);
  const done = pct(k.completed, k.headcount);

  return (
    <>
      <PageHead title={`${k.readyToday} of ${k.completed} assessed employees meet today’s AI expectations.`} sub="Totals from the completed conversations. No single persons." />

      <Tiles>
        <KpiTile
          icon="shield"
          label="Fit for today"
          value={fit}
          unit="%"
          sub={`${k.readyToday} of ${k.completed} assessed`}
          delta={change(fit, pct(before.readyToday, before.completed), " pts")}
          spark={history.map((h) => pct(h.readyToday, h.completed))}
          href="#/hr/gaps/baseline"
        />
        <KpiTile
          icon="target"
          label="At the 2030 target"
          value={target}
          unit="%"
          sub="of all agreed levels"
          delta={change(target, Math.round((before.atTargetShare ?? 0) * 100), " pts")}
          spark={history.map((h) => Math.round((h.atTargetShare ?? 0) * 100))}
          href="#/hr/gaps/target"
        />
        <KpiTile
          icon="people"
          label="Conversations done"
          value={done}
          unit="%"
          sub={`${k.completed} of ${k.headcount} employees`}
          delta={change(k.completed, before.completed)}
          spark={history.map((h) => h.completed)}
          href="#/hr/teams"
        />
      </Tiles>

      <div className="grid-1-1">
        <Card title="Largest gaps" aside={<a href="#/hr/gaps">Gap analysis</a>} flush>
          <ul className="rows">
            {ranked.slice(0, 3).map((row, i) => (
              <li key={row.family.id + row.competency.id}>
                <button type="button" className="row" onClick={() => openDrawer({ type: "cell", familyId: row.family.id, competencyId: row.competency.id })}>
                  <span className="rank">{i + 1}</span>
                  <span className="row-main">
                    <strong>{row.competency.name}</strong>
                    <span className="sub">{row.family.name}</span>
                  </span>
                  <span className="row-figure">
                    <strong>{row.belowToday}</strong> of {row.assessed}
                    <span className="sub">below today’s expectation</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Teams that lag behind" aside={<a href="#/hr/teams">All teams</a>} flush>
          {slow.length === 0 ? (
            <p className="empty">Every team has done at least half of its conversations.</p>
          ) : (
            <ul className="rows">
              {slow.slice(0, 3).map((row) => (
                <li key={row.team.id}>
                  <button type="button" className="row" onClick={() => openDrawer({ type: "team", id: row.team.id })}>
                    <span className="row-main">
                      <strong>{row.team.name}</strong>
                      <span className="sub">{row.team.manager}</span>
                    </span>
                    <span className="row-figure">
                      <strong>{row.completed}</strong> of {row.headcount}
                      <span className="sub">conversations done</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

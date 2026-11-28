import { KpiTile, Tiles, change } from "../../components/KpiTile";
import { SimNote } from "../../components/Learning";
import { Card, PageHead } from "../../components/Ui";
import { useData } from "../../data";
import { MIN_GROUP, kpiHistory, kpis, priorities, teamCoverage, tooFew } from "../../lib/metrics";
import { pathTo2030 } from "../../lib/scoring";
import { useUi } from "../../ui";

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

/** HR dashboard: three figures that answer the three questions, and the few things to look at next. */
export function HrHome() {
  const { content, org, assessments } = useData();
  const { openDrawer } = useUi();
  const k = kpis(content, org.employees, assessments);
  // The trend starts once enough people are assessed for a share to mean something.
  const history = kpiHistory(content, org.employees, assessments).filter((h) => h.completed >= MIN_GROUP);
  // Compare with four weeks ago, or with the oldest week there is.
  const weeks = Math.min(4, history.length - 1);
  const before = history[history.length - 1 - weeks] ?? k;
  const ranked = priorities(content, org.employees, assessments);
  const slow = teamCoverage(org, assessments)
    .filter((c) => c.completed / c.headcount < 0.5)
    .reverse();

  if (tooFew(k.completed)) {
    return (
      <>
        <PageHead title="Not enough conversations yet." sub={`Totals appear once ${MIN_GROUP} conversations are completed, so that no figure can be traced to a single person.`} />
        <Tiles>
          <KpiTile icon="people" label="Conversations done" value={k.completed} unit={` of ${k.headcount}`} sub="employees" href="#/hr/teams" />
        </Tiles>
      </>
    );
  }

  const fit = pct(k.readyToday, k.completed);
  const target = Math.round((k.atTargetShare ?? 0) * 100);
  const done = pct(k.completed, k.headcount);

  return (
    <>
      <PageHead title={`${k.readyToday} of ${k.completed} assessed employees meet today’s expectations.`} sub="Totals from the completed conversations. No single persons." />

      <Tiles>
        <KpiTile
          icon="shield"
          label="Fit for today"
          value={fit}
          unit="%"
          sub={`${k.readyToday} of ${k.completed} assessed`}
          delta={change(fit, pct(before.readyToday, before.completed), weeks, " pts")}
          meter={fit}
          href="#/hr/gaps/baseline"
        />
        <KpiTile
          icon="target"
          label="At the 2030 target"
          value={target}
          unit="%"
          sub="of all agreed levels"
          delta={change(target, Math.round((before.atTargetShare ?? 0) * 100), weeks, " pts")}
          meter={target}
          href="#/hr/gaps/target"
        />
        <KpiTile
          icon="people"
          label="Conversations done"
          value={done}
          unit="%"
          sub={`${k.completed} of ${k.headcount} employees`}
          delta={change(k.completed, before.completed, weeks)}
          spark={history.map((h) => h.completed)}
          href="#/hr/teams"
        />
      </Tiles>

      <Card title="Path to the 2030 profiles" aside={`${Math.round((k.progress ?? 0) * 100)}% of the required levels reached`}>
        <div className="meters path">
          {pathTo2030(k.progress ?? 0).map((point) => {
            const value = Math.round((point.measured ?? point.planned) * 100);
            return (
              <div key={point.year} className="meter">
                <span className="meter-name">
                  {point.year}
                  <span className="sub">{point.measured !== null ? "measured in the conversations" : point.year === 2030 ? "target state" : "planned"}</span>
                </span>
                <span className="meter-track" role="img" aria-label={`${value} percent`}>
                  <span className={"meter-fill" + (point.measured === null ? " planned" : "")} style={{ width: `${value}%` }} />
                </span>
                <span className="meter-figure">{value}%</span>
              </div>
            );
          })}
        </div>
        <p className="muted small path-note">
          The 2030 profiles are set in advance from the tasks of each job family, so they are 100%. Every yearly round of conversations adds a measured point; the
          plan shows equal steps from the first measurement to 2030. A level above the target does not count extra.
        </p>
      </Card>
      <SimNote />

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

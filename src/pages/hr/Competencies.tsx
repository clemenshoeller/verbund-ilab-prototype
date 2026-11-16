import { LevelBar } from "../../components/Level";
import { Card, PageHead } from "../../components/Ui";
import { useData } from "../../data";
import { competencyStats, familyGrid, measureReach, percent } from "../../lib/metrics";
import { go } from "../../lib/router";
import { measureUptake } from "../../lib/workflow";

export function CompetencyList() {
  const { content, org, assessments } = useData();
  const stats = competencyStats(content, org.employees, assessments);
  const groupName = (id: string) => content.groups.find((g) => g.id === id)?.name ?? id;

  return (
    <>
      <PageHead title="Competencies" sub={`${content.competencies.length} AI competencies in ${content.groups.length} groups, each with three levels`} />
      <Card flush>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Competency</th>
                <th>Group</th>
                <th className="num">Job families</th>
                <th className="num">Rated</th>
                <th className="num">Below today’s level</th>
                <th className="num">Below 2030 target</th>
                <th className="num">Measures</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr
                  key={s.competency.id}
                  className="clickable"
                  tabIndex={0}
                  onClick={() => go(`/hr/competencies/${s.competency.id}`)}
                  onKeyDown={(event) => event.key === "Enter" && go(`/hr/competencies/${s.competency.id}`)}
                >
                  <td>
                    <strong>{s.competency.name}</strong>
                    <span className="sub">{s.competency.description}</span>
                  </td>
                  <td>{groupName(s.competency.group)}</td>
                  <td className="num">{content.families.filter((f) => (f.profile[s.competency.id]?.target ?? 0) > 0).length}</td>
                  <td className="num">{s.rated}</td>
                  <td className="num">{s.rated ? percent(s.belowToday / s.rated) : "–"}</td>
                  <td className="num">{s.rated ? percent(s.belowTarget / s.rated) : "–"}</td>
                  <td className="num">{content.measures.filter((m) => m.competencies.includes(s.competency.id)).length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

export function CompetencyRecord({ competencyId }: { competencyId: string }) {
  const { content, org, assessments, assignments } = useData();
  const stat = competencyStats(content, org.employees, assessments).find((s) => s.competency.id === competencyId);
  if (!stat) return <PageHead crumbs={[{ label: "Competencies", href: "#/hr/competencies" }]} title="Not found" />;

  const { competency } = stat;
  const group = content.groups.find((g) => g.id === competency.group)!;
  const grid = familyGrid(content, org.employees, assessments, "target");
  const max = Math.max(1, ...stat.distribution);
  const measures = content.measures.filter((m) => m.competencies.includes(competency.id));
  const typeName = (id: string) => content.measureTypes.find((t) => t.id === id)?.name ?? id;

  return (
    <>
      <PageHead crumbs={[{ label: "Competencies", href: "#/hr/competencies" }, { label: competency.name }]} title={competency.name} sub={`${group.name} · ${competency.description}`} />

      <div className="facts">
        <span>
          <em>Rated employees</em>
          <strong>{stat.rated}</strong>
        </span>
        <span>
          <em>Below today’s level</em>
          <strong>{stat.rated ? percent(stat.belowToday / stat.rated) : "–"}</strong>
        </span>
        <span>
          <em>Below 2030 target</em>
          <strong>{stat.rated ? percent(stat.belowTarget / stat.rated) : "–"}</strong>
        </span>
        <span>
          <em>Levels missing to 2030</em>
          <strong>{stat.missingLevels}</strong>
        </span>
      </div>

      <div className="grid-1-1">
        <Card title="Definition">
          <ol className="level-list">
            {content.levels.map((level) => (
              <li key={level.value}>
                <span className="lvl">{level.value}</span>
                <span>
                  <strong>{level.name}</strong> {competency.levels[level.value - 1]}
                </span>
              </li>
            ))}
          </ol>
          <blockquote className="ask">
            <span className="ask-label">Question in the conversation</span>
            {competency.question}
          </blockquote>
        </Card>

        <Card title="Agreed levels today" aside={`${stat.rated} rated employees`}>
          <div className="bars">
            {stat.distribution.map((count, level) => (
              <div key={level} className="bar-row" title={`Level ${level}: ${count} employees`}>
                <span className="bar-name">{level === 0 ? "0 Not yet" : `${level} ${content.levels[level - 1].name}`}</span>
                <span className="bar-track">
                  <span className="bar-fill" style={{ width: `${(count / max) * 100}%` }} />
                </span>
                <span className="bar-figure">{count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Required level by job family" flush>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Job family</th>
                <th>Today</th>
                <th>Target 2030</th>
                <th className="num">Rated</th>
                <th className="num">Below 2030 target</th>
              </tr>
            </thead>
            <tbody>
              {grid.map((row) => {
                const entry = row.family.profile[competency.id];
                const cell = row.cells[competency.id];
                if (!entry || !cell) return null;
                return (
                  <tr key={row.family.id}>
                    <td>
                      <a href={`#/hr/profiles/${row.family.id}`}>
                        <strong>{row.family.name}</strong>
                      </a>
                    </td>
                    <td>
                      <LevelBar value={entry.baseline} />
                    </td>
                    <td>
                      <LevelBar value={entry.target} />
                    </td>
                    <td className="num">{cell.assessed}</td>
                    <td className="num">{cell.hidden ? "n<5" : `${cell.below} (${percent(cell.share)})`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Measures that build this competency" aside={<a href="#/hr/measures">All measures</a>} flush>
        <ul className="rows">
          {measures.map((m) => {
            const uptake = measureUptake(org.employees, assignments, m.id);
            return (
              <li key={m.id} className="row static">
                <span className="kind">{typeName(m.type)}</span>
                <span className="row-main">
                  <strong>{m.title}</strong>
                  <span className="sub">{m.description}</span>
                </span>
                <span className="row-figure">
                  {content.measureTypes.find((t) => t.id === m.type)?.perPerson ? (
                    <>
                      <strong>{uptake.assigned}</strong> agreed
                    </>
                  ) : (
                    "For the organisation"
                  )}
                  <span className="sub">{measureReach(content, org.employees, assessments, m)} employees with a fitting gap</span>
                </span>
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}

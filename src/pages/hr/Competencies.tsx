import { LevelBar } from "../../components/Level";
import { Card, NotFound, PageHead } from "../../components/Ui";
import { useData } from "../../data";
import { MIN_GROUP, competencyStats, familyGrid, measureReach, percent, tooFew } from "../../lib/metrics";
import { useUi } from "../../ui";
import { measureUptake } from "../../lib/workflow";

export function CompetencyList() {
  const { content, org, assessments } = useData();
  const { openDrawer } = useUi();
  const stats = competencyStats(content, org.employees, assessments);
  const groupOf = (id: string) => content.groups.find((g) => g.id === id);
  const general = content.competencies.filter((c) => c.group === "general").length;
  const further = content.furtherSkills ?? [];
  const name = (id?: string) => content.competencies.find((c) => c.id === id)?.name;

  return (
    <>
      <PageHead title="Competencies" sub={`${content.competencies.length - general} AI competencies from VERBUND’s competency model (“Miteinander | AI nutzen”) and ${general} general competencies, each with three levels`} />
      <Card title="The framework in three layers" aside="Team framework, draft of 27.11.2026">
        <ol className="cycle chain">
          <li>
            <span className="period">1</span>
            <strong>AI competencies</strong>
            <span className="sub">The six of VERBUND’s competency model, unchanged: base, future and leadership competencies.</span>
          </li>
          <li>
            <span className="period">2</span>
            <strong>Further skills</strong>
            <span className="sub">
              {further.length} skills beyond AI that our interviews say gain importance. {further.filter((skill) => skill.inTool).length} are covered by a competency in this tool.
            </span>
          </li>
          <li>
            <span className="period">3</span>
            <strong>Per job family</strong>
            <span className="sub">
              How the common tasks change until 2030 and what they need: <a href="#/hr/tasks">Changing tasks</a>.
            </span>
          </li>
        </ol>
      </Card>
      <Card flush>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Competency</th>
                <th>Group</th>
                <th className="num">Meet today’s expectation</th>
                <th className="num">Reach 2030 target</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.competency.id} className="clickable" onClick={() => openDrawer({ type: "competency", id: s.competency.id })}>
                  <td>
                    <button
                      type="button"
                      className="rowlink"
                      onClick={(event) => {
                        event.stopPropagation();
                        openDrawer({ type: "competency", id: s.competency.id });
                      }}
                    >
                      {s.competency.name}
                    </button>
                    <span className="sub">{s.competency.description}</span>
                  </td>
                  <td>
                    {groupOf(s.competency.group)?.name ?? s.competency.group}
                    {groupOf(s.competency.group)?.note && <span className="sub">{groupOf(s.competency.group)?.note}</span>}
                  </td>
                  <td className="num">{s.hidden ? `n<${MIN_GROUP}` : percent(1 - s.belowToday / s.rated)}</td>
                  <td className="num">{s.hidden ? `n<${MIN_GROUP}` : percent(1 - s.belowTarget / s.rated)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title="Further skills from the interviews" aside={`${further.length} skills · team framework, draft`} flush>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Skill</th>
                <th>Why it gains importance</th>
                <th>Named in</th>
                <th>In this tool</th>
              </tr>
            </thead>
            <tbody>
              {further.map((skill) => (
                <tr key={skill.name}>
                  <td>
                    <strong>{skill.name}</strong>
                  </td>
                  <td>{skill.why}</td>
                  <td>
                    {skill.interviews.length} interviews
                    <span className="sub">{skill.interviews.join(", ")}</span>
                  </td>
                  <td>{skill.inTool ? <a href={`#/hr/competencies/${skill.inTool}`}>{name(skill.inTool)}</a> : <span className="muted">Not assessed</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small card-note">
          Skills and interview references follow the team’s coding of the interviews; a skill that merges several codes carries the interviews of its parts. The count
          is no weighting. VERBUND’s own general competencies were not available to the team; these skills stand in for them. Only a few are assessed here, so that the
          self-check stays under 40 minutes.
        </p>
      </Card>
    </>
  );
}

export function CompetencyRecord({ competencyId }: { competencyId: string }) {
  const { content, org, assessments, assignments } = useData();
  const stat = competencyStats(content, org.employees, assessments).find((s) => s.competency.id === competencyId);
  if (!stat) return <NotFound what="Competency" back="#/hr/competencies" backLabel="Competencies" />;

  const { competency } = stat;
  const group = content.groups.find((g) => g.id === competency.group)!;
  const grid = familyGrid(content, org.employees, assessments, "target");
  const measures = content.measures.filter((m) => m.competencies.includes(competency.id));
  const typeName = (id: string) => content.measureTypes.find((t) => t.id === id)?.name ?? id;

  return (
    <>
      <PageHead crumbs={[{ label: "Competencies", href: "#/hr/competencies" }, { label: competency.name }]} title={competency.name} sub={`${group.name}: ${competency.description}`} />

      <div className="facts">
        <span>
          <em>Rated employees</em>
          <strong>{stat.rated}</strong>
        </span>
        <span>
          <em>Meet today’s expectation</em>
          <strong>{stat.hidden ? `n<${MIN_GROUP}` : percent(1 - stat.belowToday / stat.rated)}</strong>
        </span>
        <span>
          <em>Reach 2030 target</em>
          <strong>{stat.hidden ? `n<${MIN_GROUP}` : percent(1 - stat.belowTarget / stat.rated)}</strong>
        </span>
      </div>

      {!competency.definition && competency.interviews && (
        <Card title="Where it comes from" aside="Team framework, draft">
          <p>
            A skill beyond AI that gains importance according to {competency.interviews.length} of our interviews ({competency.interviews.join(", ")}). It stands in for
            the general competencies of VERBUND’s competency model, which were not available to the team.
          </p>
        </Card>
      )}

      {competency.definition && (
        <Card title="Definition" aside={competency.original ? `VERBUND: ${competency.original}` : undefined}>
          <p>{competency.definition}</p>
          {competency.includes && (
            <p className="muted includes">
              <strong>Includes, in the team’s framework:</strong> {competency.includes}.
            </p>
          )}
          {competency.anchors && (
            <div className="anchors">
              {(
                [
                  ["weak", "Too little"],
                  ["good", "Good"],
                  ["overdone", "Too much"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className={`anchor ${key}`}>
                  <h3>{label}</h3>
                  <ul>
                    {competency.anchors?.[key].map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Card title="Levels in the competency check" aside="Student-team draft">
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

      {competency.cases && (
        <Card title="Cases and tasks in the self-check" aside={`${competency.cases.length} cases, ${competency.tasks?.length ?? 0} written · student-team draft`} flush>
          {competency.cases.map((task) => (
            <details key={task.id} className="comp">
              <summary>
                <span className="comp-main">
                  <strong>{task.title}</strong>
                  <span className="sub">
                    {task.families ? `For ${task.families.map((id) => content.families.find((f) => f.id === id)?.name ?? id).join(", ")}` : "For every job family"} · about{" "}
                    {task.minutes} min
                  </span>
                </span>
                <span />
                <span />
              </summary>
              <div className="comp-body">
                <p>{task.situation}</p>
                <ol className="level-list">
                  {[...task.options]
                    .sort((a, b) => a.level - b.level)
                    .map((option) => (
                      <li key={option.text}>
                        <span className="lvl">{option.level}</span>
                        <span>{option.text}</span>
                      </li>
                    ))}
                </ol>
              </div>
            </details>
          ))}
          {(competency.tasks ?? []).map((task) => (
            <details key={task.id} className="comp">
              <summary>
                <span className="comp-main">
                  <strong>{task.title}</strong>
                  <span className="sub">
                    Written task · {task.families ? `for ${task.families.map((id) => content.families.find((f) => f.id === id)?.name ?? id).join(", ")}` : "for every job family"} ·
                    about {task.minutes} min
                  </span>
                </span>
                <span />
                <span />
              </summary>
              <div className="comp-body">
                <p>
                  {task.task} {task.prompts.join(" ")}
                </p>
                <p className="plan-label">What the manager looks for</p>
                <ol className="level-list">
                  {task.lookFor.map((line, i) => (
                    <li key={line}>
                      <span className="lvl">{i + 1}</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </details>
          ))}
          <p className="muted small card-note">
            A written task is not rated by the tool: the manager reads it in the conversation. In the cases, employees see the answers in mixed order and without the level. The level of a competency is the highest one reached in at least two thirds of its cases.
          </p>
        </Card>
      )}

      <Card title="Required level by job family" flush>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Job family</th>
                <th>Today</th>
                <th>Target 2030</th>
                <th className="num">Rated</th>
                <th className="num">Reach 2030 target</th>
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
                    <td className="num">{cell.hidden ? `n<${MIN_GROUP}` : `${cell.reached} (${percent(1 - cell.share)})`}</td>
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
            const reach = measureReach(content, org.employees, assessments, m);
            return (
              <li key={m.id} className="row static">
                <span className="kind">{typeName(m.type)}</span>
                <span className="row-main">
                  <strong>{m.title}</strong>
                  <span className="sub">{m.description}</span>
                </span>
                <span className="row-figure">
                  {!content.measureTypes.find((t) => t.id === m.type)?.perPerson ? (
                    "For the organisation"
                  ) : tooFew(reach) ? (
                    `would fit fewer than ${MIN_GROUP}`
                  ) : (
                    <>
                      <strong>{uptake.assigned}</strong> of {reach} agreed
                    </>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}

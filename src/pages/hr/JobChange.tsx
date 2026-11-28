import { LevelBar } from "../../components/Level";
import { CourseLinks, SimNote, TaskTable } from "../../components/Learning";
import { Steps, StepsLegend } from "../../components/Steps";
import { Card, PageHead } from "../../components/Ui";
import { useData } from "../../data";
import { profileCompetencies, totalGap } from "../../lib/gap";
import { tasksBehind } from "../../lib/jobprofile";
import { switchTo } from "../../lib/router";
import { progress, recommendMeasures, rowsForLevels } from "../../lib/scoring";
import type { Content, Family } from "../../types";

/** The way from the research findings to a figure in the tool, shown once so the logic can be followed. */
const CHAIN = [
  { step: "1", what: "Findings", detail: "Interviews and desk research: how the work of a job family changes." },
  { step: "2", what: "Tasks", detail: "The common tasks today and in 2030, one line each." },
  { step: "3", what: "Levels", detail: "The level each task needs per competency, AI and general." },
  { step: "4", what: "Target profile", detail: "Per competency the highest level any task asks for. Set in advance." },
  { step: "5", what: "Gap", detail: "Target minus the level agreed in the conversation." },
  { step: "6", what: "Measures", detail: "What builds the competencies with the largest gaps." },
];

function FamilyTabs({ content, family, base }: { content: Content; family: Family; base: string }) {
  return (
    <div className="tabs" role="tablist" aria-label="Job family">
      {content.families.map((f) => (
        <button key={f.id} role="tab" type="button" aria-selected={f.id === family.id} className={"tab" + (f.id === family.id ? " on" : "")} onClick={() => switchTo(`${base}/${f.id}`)}>
          {f.name}
        </button>
      ))}
    </div>
  );
}

/** Gap analysis beyond AI: how the tasks of a job family change, and the target profile that follows from them. */
export function HrTasks({ familyId }: { familyId?: string }) {
  const { content } = useData();
  const family = content.families.find((f) => f.id === familyId) ?? content.families[0];
  const competencies = profileCompetencies(content, family);
  const group = (id: string) => content.groups.find((g) => g.id === id)?.name ?? id;

  return (
    <>
      <PageHead
        title="Changing tasks"
        sub="How the common tasks of each focus job family change until 2030, and which competencies they need, AI and general. The target profile follows from them."
      />

      <Card title="From the findings to the tool">
        <ol className="cycle chain">
          {CHAIN.map((link) => (
            <li key={link.step}>
              <span className="period">{link.step}</span>
              <strong>{link.what}</strong>
              <span className="sub">{link.detail}</span>
            </li>
          ))}
        </ol>
      </Card>

      <FamilyTabs content={content} family={family} base="/hr/tasks" />
      <p className="lead">{family.summary}</p>

      <Card title="Tasks today and in 2030" aside={`${family.tasks?.length ?? 0} common tasks`} flush>
        <TaskTable content={content} family={family} />
        {family.basis && <p className="muted small card-note">Based on: {family.basis}</p>}
      </Card>

      <Card title="Target profile that follows from the tasks" aside={<a href={`#/hr/profiles/${family.id}`}>Open the job family</a>} flush>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Competency</th>
                <th>Needed today</th>
                <th>Needed in 2030</th>
                <th>The 2030 level is set by</th>
              </tr>
            </thead>
            <tbody>
              {competencies.map((competency) => {
                const entry = family.profile[competency.id];
                return (
                  <tr key={competency.id}>
                    <td>
                      <a href={`#/hr/competencies/${competency.id}`}>
                        <strong>{competency.name}</strong>
                      </a>
                      <span className="sub">{group(competency.group)}</span>
                    </td>
                    <td>
                      <LevelBar value={entry.baseline} />
                    </td>
                    <td>
                      <LevelBar value={entry.target} />
                    </td>
                    <td>
                      {tasksBehind(family, competency.id)
                        .map((task) => task.task)
                        .join(" · ") || <span className="muted">Set by the owner of the model</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="muted small card-note">
          Rule: a competency is needed at the level of the most demanding task. A new job description can raise a target (Competency model, Upload); lowering one stays
          with the owner of the model.
        </p>
      </Card>
    </>
  );
}

/** Personas as a simulated current state: what the tool says about a beginner, an advanced user and an expert. */
export function HrPersonas({ familyId }: { familyId?: string }) {
  const { content } = useData();
  const family = content.families.find((f) => f.id === familyId) ?? content.families[0];
  const personas = family.personas ?? [];

  return (
    <>
      <PageHead
        title="Personas"
        sub="There is no current-state data for VERBUND yet. Three example persons per job family stand in for it and show what the gap analysis says about each."
      />
      <SimNote>
        The personas are example profiles written by the student team. They show what the tool does with a profile once real conversations exist; they are no finding
        about VERBUND’s employees.
      </SimNote>

      <FamilyTabs content={content} family={family} base="/hr/personas" />

      <div className="personas">
        {personas.map((persona) => {
          const rows = rowsForLevels(content, family, persona.levels);
          const reached = Math.round((progress(rows) ?? 0) * 100);
          const steps = totalGap(rows) ?? 0;
          const below = rows.filter((row) => (row.agreed ?? 0) < row.baseline).length;
          const ideas = recommendMeasures(content, family, rows).slice(0, 2);
          return (
            <Card key={persona.id} title={persona.name} aside={persona.role}>
              <p className="muted">{persona.story}</p>
              <p className="persona-figure">
                <strong>{reached}%</strong> of the 2030 profile
                <span className="sub">
                  {steps === 0 ? "No step to go" : `${steps} ${steps === 1 ? "step" : "steps"} to go`}
                  {below > 0 && ` · below today’s expectation in ${below} of ${rows.length}`}
                </span>
              </p>
              <ul className="mini-rows">
                {rows.map((row) => (
                  <li key={row.competency.id}>
                    <span>{row.competency.name}</span>
                    <Steps value={row.agreed} target={row.target} baseline={row.baseline} levels={content.levels} compact />
                  </li>
                ))}
              </ul>
              <p className="plan-label">Measures that fit</p>
              {ideas.length === 0 ? (
                <p className="muted">None needed: the 2030 profile is reached.</p>
              ) : (
                <ul className="plan">
                  {ideas.map(({ measure }) => (
                    <li key={measure.id}>
                      <span>
                        {measure.title}
                        <CourseLinks courses={measure.courses?.slice(0, 1)} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>
      <StepsLegend />
    </>
  );
}

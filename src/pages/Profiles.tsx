import { TaskTable } from "../components/Learning";
import { Steps, StepsLegend } from "../components/Steps";
import { Card, PageHead } from "../components/Ui";
import { useData } from "../data";
import { profileCompetencies } from "../lib/gap";
import { tasksBehind } from "../lib/jobprofile";
import { switchTo } from "../lib/router";
import type { Content } from "../types";

/** Target profile per job family. Shown in both views; HR reaches it as "Job families". */
export function Profiles({ familyId, base }: { familyId?: string; base: string }) {
  const { content, org } = useData();
  const family = content.families.find((f) => f.id === familyId) ?? content.families[0];
  const competencies = profileCompetencies(content, family);
  const hr = base === "/hr";
  const headcount = org.employees.filter((e) => e.family === family.id).length;

  return (
    <>
      <PageHead title={hr ? "Job families" : "Target profiles"} sub="What each job family needs today and in 2030. Open a line for the detail." />

      <div className="tabs" role="tablist" aria-label="Job family">
        {content.families.map((f) => (
          <button key={f.id} role="tab" type="button" aria-selected={f.id === family.id} className={"tab" + (f.id === family.id ? " on" : "")} onClick={() => switchTo(`${base}/profiles/${f.id}`)}>
            {f.name}
          </button>
        ))}
      </div>

      <p className="lead">
        {family.summary}
        {hr && ` ${headcount} employees.`}
      </p>

      {content.groups.map((group) => {
        const inGroup = competencies.filter((c) => c.group === group.id);
        if (inGroup.length === 0) return null;
        return (
          <Card key={group.id} title={group.name} flush>
            {inGroup.map((c) => {
              const entry = family.profile[c.id];
              return (
                <details key={c.id} className="comp">
                  <summary>
                    <span className="comp-main">
                      <strong>{c.name}</strong>
                      <span className="sub">
                        Today: {levelName(content, entry.baseline)} · 2030: {levelName(content, entry.target)}
                      </span>
                    </span>
                    <Steps value={entry.baseline} target={entry.target} levels={content.levels} compact />
                    <span />
                  </summary>
                  <div className="comp-body">
                    <p>{c.description}</p>
                    <dl>
                      <dt>2030: {levelName(content, entry.target)}</dt>
                      <dd>{c.levels[entry.target - 1]}</dd>
                      {c.examples[family.id] && (
                        <>
                          <dt>In this job</dt>
                          <dd>{c.examples[family.id]}</dd>
                        </>
                      )}
                      {tasksBehind(family, c.id).length > 0 && (
                        <>
                          <dt>Needed for</dt>
                          <dd>
                            {tasksBehind(family, c.id)
                              .map((task) => task.task)
                              .join(" · ")}
                          </dd>
                        </>
                      )}
                    </dl>
                    {hr && (
                      <p style={{ marginTop: 10 }}>
                        <a href={`#/hr/competencies/${c.id}`}>Open the competency</a>
                      </p>
                    )}
                  </div>
                </details>
              );
            })}
          </Card>
        );
      })}

      <StepsLegend />

      {family.tasks && (
        <Card title="How the job changes until 2030" aside={hr ? <a href={`#/hr/tasks/${family.id}`}>Tasks and levels</a> : `${family.tasks.length} common tasks`} flush>
          <TaskTable content={content} family={family} needs={false} />
          <p className="muted small card-note">The profile above follows from these tasks: each competency is needed at the level the most demanding task asks for.</p>
        </Card>
      )}
    </>
  );
}

function levelName(content: Content, value: number): string {
  return content.levels.find((l) => l.value === value)?.name ?? "Not required yet";
}

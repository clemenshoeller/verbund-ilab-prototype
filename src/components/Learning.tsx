import type { ReactNode } from "react";
import type { Recommendation } from "../lib/scoring";
import type { Content, CourseLink, Family, TaskChange } from "../types";

/**
 * Where to learn it: a hint and a link. The learning itself happens in VERBUND's learning offer
 * or at the provider, never inside this tool.
 */
export function CourseLinks({ courses }: { courses?: CourseLink[] }) {
  if (!courses?.length) return null;
  return (
    <ul className="courses">
      {courses.map((course) => (
        <li key={course.title}>
          {course.url ? (
            <a href={course.url} target="_blank" rel="noreferrer">
              {course.title}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : (
            <span className="course-own">{course.title}</span>
          )}
          <span className="sub">
            {course.provider} · {course.format}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Measures that fit a person's gaps, each with what it builds and where to start. */
export function Recommendations({ list, empty }: { list: Recommendation[]; empty: string }) {
  if (list.length === 0) return <p className="empty">{empty}</p>;
  return (
    <ul className="rows">
      {list.map(({ measure, closes }) => (
        <li key={measure.id} className="row static idea">
          <span className="row-main">
            <strong>{measure.title}</strong>
            <span className="sub">
              Builds: {closes.map((row) => row.competency.name).join(", ")}. {measure.description}
            </span>
            <CourseLinks courses={measure.courses} />
          </span>
        </li>
      ))}
    </ul>
  );
}

const CHANGE: Record<TaskChange["change"], { label: string; hint: string }> = {
  automated: { label: "Largely automated", hint: "The routine part runs without people; checking and exceptions stay" },
  augmented: { label: "Done with AI", hint: "People do the task with AI support and answer for the result" },
  new: { label: "New task", hint: "Comes up because of AI" },
  stable: { label: "Changes little", hint: "AI plays a small part" },
};

export function ChangeChip({ change }: { change: TaskChange["change"] }) {
  return (
    <span className={`chip change-${change}`} title={CHANGE[change].hint}>
      {CHANGE[change].label}
    </span>
  );
}

/** The common tasks of a job family today and in 2030, with the competencies the 2030 task needs. */
export function TaskTable({ content, family, needs = true }: { content: Content; family: Family; needs?: boolean }) {
  const tasks = family.tasks ?? [];
  const name = (id: string) => content.competencies.find((c) => c.id === id)?.name ?? id;
  const level = (value: number) => content.levels.find((l) => l.value === value)?.name ?? "";
  return (
    <div className="table-wrap">
      <table className="table tasks">
        <thead>
          <tr>
            <th>Task</th>
            <th>Today</th>
            <th>In 2030</th>
            {needs && <th>Needs in 2030</th>}
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id}>
              <td>
                <strong>{task.task}</strong>
                <span className="sub">
                  <ChangeChip change={task.change} />
                </span>
              </td>
              <td>{task.source ? <span className="muted">From the job description “{task.source}”</span> : task.today}</td>
              <td>{task.future}</td>
              {needs && (
                <td>
                  <ul className="needs">
                    {Object.entries(task.needs2030).map(([id, value]) => (
                      <li key={id}>
                        {name(id)} <span className="lvl" title={level(value)}>{value}</span>
                      </li>
                    ))}
                  </ul>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Marks figures that rest on invented people: the logic is real, the result is not a finding about VERBUND. */
export function SimNote({ children }: { children?: ReactNode }) {
  return (
    <p className="callout sim">
      <strong>Simulated.</strong> {children ?? "The people and ratings behind these figures are invented. They show how the analysis works, not where VERBUND stands."}
    </p>
  );
}

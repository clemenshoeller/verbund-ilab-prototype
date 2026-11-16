import { LevelBar } from "../components/Level";
import { gapRows, statusOf, totalGap } from "../lib/gap";
import { go } from "../lib/router";
import type { Assessment, Assessments, Content, Employee } from "../types";

interface Props {
  content: Content;
  employees: Employee[];
  assessments: Assessments;
  employeeId?: string;
}

export function Gaps({ content, employees, assessments, employeeId }: Props) {
  const employee = employees.find((e) => e.id === employeeId);

  return (
    <>
      <div className="page-head">
        <p className="eyebrow">Step 3</p>
        <h1>Gaps and measures</h1>
        <p className="lead">Agreed level compared with the 2030 target. The number is the levels still missing.</p>
      </div>

      <section>
        <div className="section-head">
          <h2>Team view</h2>
          <p className="muted">Select a row for the details.</p>
        </div>
        <div className="table-wrap">
          <table className="table heat">
            <thead>
              <tr>
                <th>Employee</th>
                {content.competencies.map((c) => (
                  <th key={c.id} className="heat-col" title={c.description}>
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => {
                const family = content.families.find((f) => f.id === e.family)!;
                const rows = gapRows(content, family, assessments[e.id]);
                return (
                  <tr
                    key={e.id}
                    className={"clickable" + (e.id === employee?.id ? " selected" : "")}
                    tabIndex={0}
                    onClick={() => go(`/team/gaps/${e.id}`)}
                    onKeyDown={(event) => event.key === "Enter" && go(`/team/gaps/${e.id}`)}
                  >
                    <td>
                      <strong>{e.name}</strong>
                      <span className="sub">{family.name}</span>
                    </td>
                    {content.competencies.map((c) => {
                      const row = rows.find((r) => r.competency.id === c.id);
                      if (!row) return <td key={c.id} className="cell na" title="Not part of this profile" />;
                      if (row.gap === null)
                        return (
                          <td key={c.id} className="cell open" title="Not agreed yet">
                            ?
                          </td>
                        );
                      return (
                        <td key={c.id} className={`cell g${Math.min(row.gap, 2)}`} title={`Level ${row.agreed}, target ${row.target}`}>
                          {row.gap === 0 ? "✓" : row.gap}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="legend small">
          <span><i className="cell g0">✓</i> at target</span>
          <span><i className="cell g1">1</i> one level missing</span>
          <span><i className="cell g2">2</i> two or more</span>
          <span><i className="cell open">?</i> not agreed yet</span>
          <span><i className="cell na" /> not in the profile</span>
        </p>
      </section>

      {employee && <Detail content={content} assessment={assessments[employee.id]} employee={employee} />}
    </>
  );
}

function Detail({
  content,
  assessment,
  employee,
}: {
  content: Content;
  assessment?: Assessment;
  employee: Employee;
}) {
  const family = content.families.find((f) => f.id === employee.family)!;
  const rows = gapRows(content, family, assessment);
  const total = totalGap(rows);
  const sorted = [...rows].sort((a, b) => (b.gap ?? -1) - (a.gap ?? -1));
  const completed = statusOf(assessment) === "completed";

  return (
    <section className="detail">
      <div className="section-head">
        <h2>{employee.name}</h2>
        <p className="muted">
          {employee.role} · {family.name}
          {assessment?.date && ` · conversation of ${formatDate(assessment.date)}`}
        </p>
      </div>

      {!completed && (
        <p className="panel">
          The conversation is not completed yet.{" "}
          <a href={`#/team/assess/${employee.id}`}>{assessment ? "Continue the conversation" : "Start the conversation"}</a>
        </p>
      )}

      {total !== null && (
        <p className="summary">
          <strong>{total}</strong> {total === 1 ? "level" : "levels"} missing to the 2030 profile
          {total > 0 && sorted[0].gap ? `, the largest gap is in “${sorted[0].competency.name}”.` : "."}
        </p>
      )}

      <div className="gap-list">
        {sorted.map((row) => {
          const note = assessment?.ratings[row.competency.id]?.note;
          return (
            <article key={row.competency.id} className="gap-row">
              <div>
                <strong>{row.competency.name}</strong>
                <span className="sub">
                  {row.agreed === null ? "Not agreed yet" : `Level ${row.agreed} today`} · target {row.target} in 2030
                </span>
                {note && <span className="sub quote">“{note}”</span>}
              </div>
              <LevelBar value={row.agreed} target={row.target} />
              <span className={"gap-chip" + (row.gap ? " has" : "")}>
                {row.gap === null ? "open" : row.gap === 0 ? "at target" : `+${row.gap}`}
              </span>
              {row.gap !== null && row.gap > 0 && (
                <ul className="measures">
                  {content.measures
                    .filter((measure) => measure.competencies.includes(row.competency.id))
                    .map((measure) => (
                      <li key={measure.id}>
                        {measure.title} <span className="type">{typeName(content, measure.type)}</span>
                      </li>
                    ))}
                </ul>
              )}
            </article>
          );
        })}
      </div>
      <p className="muted small">Measures are general types per competency, not an individual learning path.</p>
    </section>
  );
}

function typeName(content: Content, id: string): string {
  return content.measureTypes.find((t) => t.id === id)?.name ?? id;
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year}`;
}

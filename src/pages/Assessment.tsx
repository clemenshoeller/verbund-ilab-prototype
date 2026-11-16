import { LevelPicker, StatusChip } from "../components/Level";
import { agreedCount, gapRows, statusOf } from "../lib/gap";
import { go } from "../lib/router";
import type { Assessment as AssessmentData, Content, Rating, Team } from "../types";

interface Props {
  content: Content;
  team: Team;
  assessments: Record<string, AssessmentData>;
  employeeId?: string;
  setRating: (employeeId: string, competencyId: string, patch: Partial<Rating>) => void;
  complete: (employeeId: string) => void;
}

export function Assessment({ content, team, assessments, employeeId, setRating, complete }: Props) {
  const employee = team.employees.find((e) => e.id === employeeId);

  if (!employee) {
    return (
      <>
        <div className="page-head">
          <p className="eyebrow">Step 2</p>
          <h1>Competency conversation</h1>
          <p className="lead">Choose the team member you want to talk to.</p>
        </div>
        <div className="cards">
          {team.employees.map((e) => {
            const family = content.families.find((f) => f.id === e.family)!;
            return (
              <a key={e.id} className="card link" href={`#/assess/${e.id}`}>
                <strong>{e.name}</strong>
                <span className="sub">{e.role}</span>
                <span className="sub">{family.name}</span>
                <StatusChip status={statusOf(assessments[e.id])} />
              </a>
            );
          })}
        </div>
      </>
    );
  }

  const family = content.families.find((f) => f.id === employee.family)!;
  const assessment = assessments[employee.id];
  const rows = gapRows(content, family, assessment);
  const agreed = agreedCount(rows);
  const allAgreed = agreed === rows.length;

  return (
    <>
      <div className="page-head">
        <p className="eyebrow">Step 2 · Competency conversation</p>
        <h1>{employee.name}</h1>
        <p className="lead">
          {employee.role} · {family.name}
        </p>
      </div>

      <section className="panel how">
        <strong>How the conversation works</strong>
        <ol>
          <li>The employee rates themself before the talk.</li>
          <li>The manager adds an own rating.</li>
          <li>Both talk about concrete examples and agree on one level.</li>
        </ol>
      </section>

      {rows.map(({ competency, target }, index) => {
        const rating = assessment?.ratings[competency.id];
        const differ = rating?.self != null && rating?.manager != null && rating.self !== rating.manager;
        const group = content.groups.find((g) => g.id === competency.group)!;
        return (
          <section key={competency.id} className="card competency">
            <header>
              <span className="count">
                {index + 1} / {rows.length}
              </span>
              <div>
                <p className="eyebrow">{group.name}</p>
                <h2>{competency.name}</h2>
                <p>{competency.description}</p>
              </div>
            </header>

            <blockquote className="ask">
              <span className="ask-label">Ask</span>
              {competency.question}
            </blockquote>

            <ol className="level-list">
              {content.levels.map((level) => (
                <li key={level.value} className={level.value === target ? "is-target" : ""}>
                  <span className="lvl">{level.value}</span>
                  <span>
                    <strong>{level.name}</strong> {competency.levels[level.value - 1]}
                    {level.value === target && <em className="target-tag">Target 2030</em>}
                  </span>
                </li>
              ))}
            </ol>

            <div className="pickers">
              <LevelPicker
                label="Self-rating"
                value={rating?.self ?? null}
                levels={content.levels}
                onChange={(value) => setRating(employee.id, competency.id, { self: value })}
              />
              <LevelPicker
                label="Manager rating"
                value={rating?.manager ?? null}
                levels={content.levels}
                onChange={(value) => setRating(employee.id, competency.id, { manager: value })}
              />
              {differ && rating?.agreed == null && (
                <p className="hint">The ratings differ. Talk about one or two concrete examples before you agree.</p>
              )}
              <LevelPicker
                strong
                label="Agreed level"
                value={rating?.agreed ?? null}
                levels={content.levels}
                onChange={(value) => setRating(employee.id, competency.id, { agreed: value })}
              />
            </div>

            <label className="note">
              <span>Note (optional)</span>
              <textarea
                rows={2}
                maxLength={300}
                value={rating?.note ?? ""}
                placeholder="Example or evidence from the conversation"
                onChange={(event) => setRating(employee.id, competency.id, { note: event.target.value })}
              />
            </label>
          </section>
        );
      })}

      <div className="finish">
        <span className="muted">
          {agreed} of {rows.length} competencies agreed
        </span>
        <button
          type="button"
          className="btn"
          disabled={!allAgreed}
          onClick={() => {
            complete(employee.id);
            go(`/gaps/${employee.id}`);
          }}
        >
          Complete and show gaps
        </button>
      </div>
    </>
  );
}

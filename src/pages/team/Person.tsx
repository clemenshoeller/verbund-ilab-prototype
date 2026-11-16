import { LevelBar, LevelPicker } from "../../components/Level";
import { Avatar, Card, LinkTabs, PageHead, StageChip, formatDate } from "../../components/Ui";
import { useData } from "../../data";
import { agreedCount, gapRows, totalGap, type GapRow } from "../../lib/gap";
import { go } from "../../lib/router";
import { stageOf } from "../../lib/workflow";
import type { AssignmentStatus, Employee, Family } from "../../types";

const STATUS: { id: AssignmentStatus; label: string }[] = [
  { id: "planned", label: "Planned" },
  { id: "running", label: "Running" },
  { id: "done", label: "Done" },
];

/** The record of one team member: profile and gaps, the conversation, agreed measures, history. */
export function Person({ employeeId, tab = "profile" }: { employeeId: string; tab?: string }) {
  const { content, team, assessments, assignments } = useData();
  const employee = team.employees.find((e) => e.id === employeeId);
  if (!employee) {
    return <PageHead crumbs={[{ label: "People", href: "#/team/people" }]} title="Not found" sub="This person is not in your team." />;
  }

  const family = content.families.find((f) => f.id === employee.family)!;
  const assessment = assessments[employee.id];
  const assigned = assignments[employee.id] ?? [];
  const rows = gapRows(content, family, assessment);
  const stage = stageOf(content, employee, assessment, assigned);
  const completed = assessment?.status === "completed";
  const gap = completed ? totalGap(rows) : null;
  const belowToday = completed ? rows.filter((r) => r.agreed !== null && r.agreed < r.baseline).length : null;
  const base = `#/team/people/${employee.id}`;
  const active = ["profile", "conversation", "measures", "activity"].includes(tab) ? tab : "profile";

  return (
    <>
      <PageHead
        crumbs={[{ label: "People", href: "#/team/people" }, { label: employee.name }]}
        title={
          <span className="record-title">
            <Avatar name={employee.name} />
            <span>
              {employee.name}
              <span className="record-sub">
                {employee.role} · {family.name} · {team.info.name}
              </span>
            </span>
          </span>
        }
        actions={
          <>
            <StageChip stage={stage} />
            {stage === "open" || stage === "talking" ? (
              <a className="btn" href={`${base}/conversation`}>
                {stage === "open" ? "Start conversation" : "Continue conversation"}
              </a>
            ) : stage === "agreed" ? (
              <a className="btn" href={`${base}/measures`}>
                Agree measures
              </a>
            ) : null}
          </>
        }
      />

      <div className="facts">
        <span>
          <em>Levels agreed</em>
          <strong>
            {agreedCount(rows)} of {rows.length}
          </strong>
        </span>
        <span>
          <em>Levels missing to 2030</em>
          <strong>{gap ?? "–"}</strong>
        </span>
        <span>
          <em>Below today’s level</em>
          <strong>{belowToday ?? "–"}</strong>
        </span>
        <span>
          <em>Measures</em>
          <strong>{assigned.length}</strong>
        </span>
        <span>
          <em>Last conversation</em>
          <strong>{formatDate(assessment?.date)}</strong>
        </span>
      </div>

      <LinkTabs
        active={active}
        tabs={[
          { id: "profile", label: "Profile and gaps", href: `${base}/profile` },
          { id: "conversation", label: "Conversation", href: `${base}/conversation` },
          { id: "measures", label: "Measures", href: `${base}/measures`, count: assigned.length },
          { id: "activity", label: "Activity", href: `${base}/activity` },
        ]}
      />

      {active === "profile" && <ProfileTab rows={rows} employee={employee} completed={completed} />}
      {active === "conversation" && <ConversationTab employee={employee} family={family} rows={rows} />}
      {active === "measures" && <MeasuresTab employee={employee} rows={rows} completed={completed} />}
      {active === "activity" && <ActivityTab employee={employee} />}
    </>
  );
}

function ProfileTab({ rows, employee, completed }: { rows: GapRow[]; employee: Employee; completed: boolean }) {
  const { assessments } = useData();
  const sorted = [...rows].sort((a, b) => (b.gap ?? -1) - (a.gap ?? -1));
  return (
    <Card
      title="Agreed level against the target profile"
      aside={completed ? "from the completed conversation" : <a href={`#/team/people/${employee.id}/conversation`}>Conversation not completed</a>}
      flush
    >
      <div className="gap-list">
        {sorted.map((row) => {
          const note = assessments[employee.id]?.ratings[row.competency.id]?.note;
          return (
            <article key={row.competency.id} className="gap-row">
              <div>
                <strong>{row.competency.name}</strong>
                <span className="sub">
                  {row.agreed === null ? "Not agreed yet" : `Level ${row.agreed} agreed`} · today {row.baseline} · 2030 target {row.target}
                </span>
                {note && <span className="sub quote">“{note}”</span>}
              </div>
              <LevelBar value={row.agreed} target={row.target} />
              <span className={"gap-chip" + (row.gap ? " has" : "")}>
                {row.gap === null ? "open" : row.gap === 0 ? "at target" : `+${row.gap} to 2030`}
              </span>
            </article>
          );
        })}
      </div>
    </Card>
  );
}

function ConversationTab({ employee, family, rows }: { employee: Employee; family: Family; rows: GapRow[] }) {
  const { content, assessments, setRating, complete } = useData();
  const assessment = assessments[employee.id];
  const agreed = agreedCount(rows);

  return (
    <>
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
              <LevelPicker label="Self-rating" value={rating?.self ?? null} levels={content.levels} onChange={(value) => setRating(employee.id, competency.id, { self: value })} />
              <LevelPicker label="Manager rating" value={rating?.manager ?? null} levels={content.levels} onChange={(value) => setRating(employee.id, competency.id, { manager: value })} />
              {differ && rating?.agreed == null && <p className="hint">The ratings differ. Talk about one or two concrete examples before you agree.</p>}
              <LevelPicker strong label="Agreed level" value={rating?.agreed ?? null} levels={content.levels} onChange={(value) => setRating(employee.id, competency.id, { agreed: value })} />
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
          {agreed} of {rows.length} competencies agreed · profile {family.name}
        </span>
        <button
          type="button"
          className="btn"
          disabled={agreed !== rows.length}
          onClick={() => {
            complete(employee.id);
            go(`/team/people/${employee.id}/measures`);
          }}
        >
          Complete and choose measures
        </button>
      </div>
    </>
  );
}

function MeasuresTab({ employee, rows, completed }: { employee: Employee; rows: GapRow[]; completed: boolean }) {
  const { content, assignments, assign, setAssignmentStatus, unassign } = useData();
  const assigned = assignments[employee.id] ?? [];
  const open = rows.filter((r) => (r.gap ?? 0) > 0);
  const typeName = (id: string) => content.measureTypes.find((t) => t.id === id)?.name ?? id;
  const competencyName = (id: string) => content.competencies.find((c) => c.id === id)?.name ?? id;
  const perPerson = new Set(content.measureTypes.filter((t) => t.perPerson).map((t) => t.id));
  const suggestions = content.measures
    .filter((m) => perPerson.has(m.type) && !assigned.some((a) => a.measureId === m.id))
    .map((m) => ({ measure: m, closes: open.filter((r) => m.competencies.includes(r.competency.id)) }))
    .filter((s) => s.closes.length > 0)
    .sort((a, b) => b.closes.reduce((n, r) => n + (r.gap ?? 0), 0) - a.closes.reduce((n, r) => n + (r.gap ?? 0), 0));

  return (
    <div className="grid-1-1">
      <Card title="Agreed measures" aside={`${assigned.length}`} flush>
        {assigned.length === 0 ? (
          <p className="empty">No measure agreed yet.</p>
        ) : (
          <ul className="rows">
            {assigned.map((a) => {
              const measure = content.measures.find((m) => m.id === a.measureId);
              if (!measure) return null;
              return (
                <li key={a.measureId} className="row static">
                  <span className="row-main">
                    <strong>{measure.title}</strong>
                    <span className="sub">
                      {typeName(measure.type)} · agreed {formatDate(a.date)}
                    </span>
                  </span>
                  <select
                    value={a.status}
                    aria-label={`Status of ${measure.title}`}
                    onChange={(event) => setAssignmentStatus(employee.id, a.measureId, event.target.value as AssignmentStatus)}
                  >
                    {STATUS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="link" onClick={() => unassign(employee.id, a.measureId)}>
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card title="Suggested for the open gaps" aside={completed ? `${suggestions.length}` : undefined} flush>
        {!completed ? (
          <p className="empty">
            Suggestions appear once the conversation is completed. <a href={`#/team/people/${employee.id}/conversation`}>Go to the conversation</a>
          </p>
        ) : suggestions.length === 0 ? (
          <p className="empty">{open.length === 0 ? "No gap to the 2030 profile." : "All fitting measures are already agreed."}</p>
        ) : (
          <ul className="rows">
            {suggestions.map(({ measure, closes }) => (
              <li key={measure.id} className="row static">
                <span className="row-main">
                  <strong>{measure.title}</strong>
                  <span className="sub">
                    {typeName(measure.type)} · for {closes.map((r) => competencyName(r.competency.id)).join(", ")}
                  </span>
                </span>
                <button type="button" className="btn ghost small" onClick={() => assign(employee.id, measure.id)}>
                  Add
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function ActivityTab({ employee }: { employee: Employee }) {
  const { content, assessments, assignments } = useData();
  const assessment = assessments[employee.id];
  const events: { date: string; text: string; detail?: string }[] = [];
  if (assessment?.date) {
    events.push({
      date: assessment.date,
      text: assessment.status === "completed" ? "Competency conversation completed" : "Competency conversation started",
      detail: `${Object.values(assessment.ratings).filter((r) => r.agreed !== null).length} levels agreed`,
    });
    for (const [id, rating] of Object.entries(assessment.ratings)) {
      if (rating.note) events.push({ date: assessment.date, text: `Note on “${content.competencies.find((c) => c.id === id)?.name}”`, detail: rating.note });
    }
  }
  for (const a of assignments[employee.id] ?? []) {
    const measure = content.measures.find((m) => m.id === a.measureId);
    if (measure) events.push({ date: a.date, text: `Measure agreed: ${measure.title}`, detail: STATUS.find((s) => s.id === a.status)?.label });
  }
  events.sort((a, b) => b.date.localeCompare(a.date));

  return (
    <Card title="Activity" flush>
      {events.length === 0 ? (
        <p className="empty">Nothing recorded yet.</p>
      ) : (
        <ol className="timeline">
          {events.map((event, i) => (
            <li key={i}>
              <span className="when">{formatDate(event.date)}</span>
              <span>
                <strong>{event.text}</strong>
                {event.detail && <span className="sub">{event.detail}</span>}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

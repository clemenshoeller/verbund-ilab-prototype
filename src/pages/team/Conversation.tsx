import { Steps } from "../../components/Steps";
import { formatDate } from "../../components/Ui";
import { useData } from "../../data";
import { agreedCount, standing, standingText, summarise, type GapRow } from "../../lib/gap";
import { go } from "../../lib/router";
import { MAX_FOCUS } from "../../lib/store";
import { selfCheckDone } from "../../lib/workflow";
import { useUi } from "../../ui";
import type { AssignmentStatus, Employee, Family } from "../../types";

const STATUS: { id: AssignmentStatus; label: string }[] = [
  { id: "planned", label: "Planned" },
  { id: "running", label: "Running" },
  { id: "done", label: "Done" },
];

/**
 * The competency conversation as a guided path: a short start, one competency per step,
 * then focus and measures, then a summary both agree on. Everything is saved as you go.
 */
export function Conversation({ employee, family, rows, step }: { employee: Employee; family: Family; rows: GapRow[]; step?: string }) {
  const { content, assessments } = useData();
  const assessment = assessments[employee.id];
  const ids = ["start", ...rows.map((r) => r.competency.id), "focus", "summary"];
  const current = ids.includes(step ?? "") ? (step as string) : "start";
  const index = ids.indexOf(current);
  const base = `/team/people/${employee.id}/conversation`;
  const first = employee.name.split(" ")[0];
  const label = (id: string) => (id === "start" ? "Before you start" : id === "focus" ? "Focus and measures" : id === "summary" ? "Summary" : content.competencies.find((c) => c.id === id)!.name);
  const done = (id: string) =>
    id === "start" ? index > 0 : id === "focus" ? (assessment?.focus?.length ?? 0) > 0 : id === "summary" ? assessment?.status === "completed" : assessment?.ratings[id]?.agreed != null;

  return (
    <div className="flow">
      <ol className="flow-steps" aria-label="Steps of the conversation">
        {ids.map((id, i) => (
          <li key={id} className={(id === current ? "on" : "") + (done(id) ? " done" : "")}>
            <a href={`#${base}/${id}`} aria-current={id === current ? "step" : undefined}>
              <span className="flow-num">{done(id) ? "✓" : i + 1}</span>
              {label(id)}
            </a>
          </li>
        ))}
        <li className="flow-saved">Saved automatically</li>
      </ol>

      <div className="flow-body">
        {current === "start" && <Start employee={employee} family={family} rows={rows} first={first} />}
        {current === "focus" && <Focus employee={employee} rows={rows} first={first} />}
        {current === "summary" && <Summary employee={employee} rows={rows} first={first} />}
        {!["start", "focus", "summary"].includes(current) && <Rate employee={employee} family={family} row={rows.find((r) => r.competency.id === current)!} first={first} position={index} total={rows.length} />}

        <div className="finish between">
          {index > 0 ? (
            <a className="btn ghost" href={`#${base}/${ids[index - 1]}`}>
              Back
            </a>
          ) : (
            <span />
          )}
          {index < ids.length - 1 && (
            <button type="button" className="btn" onClick={() => go(`${base}/${ids[index + 1]}`)}>
              {current === "start" ? "Start with the first competency" : `Next: ${label(ids[index + 1])}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Start({ employee, family, rows, first }: { employee: Employee; family: Family; rows: GapRow[]; first: string }) {
  const { content, assessments } = useData();
  const prepared = selfCheckDone(content, employee, assessments[employee.id]);
  return (
    <section className="card question">
      <p className="eyebrow">Competency conversation · part of the yearly appraisal talk · about 20 minutes</p>
      <h2>You and {first} agree on one level per competency.</h2>
      <ul className="points">
        <li>
          <strong>It is about development.</strong> The result is not used for pay or appraisal. Say so at the beginning.
        </li>
        <li>
          <strong>Talk about examples.</strong> Each step gives you a question and what the levels look like in {first}’s job.
        </li>
        <li>
          <strong>Agree, do not average.</strong> Where your views differ, the example decides. You end with {MAX_FOCUS} focus areas at most.
        </li>
      </ul>
      <p className={"callout" + (prepared ? " ok" : "")}>
        {prepared
          ? `${first} has done the self-check. You see the answers in each step.`
          : `${first} has not done the self-check yet. You can still start; ${first} answers in the conversation.`}
      </p>
      <p className="muted small">
        Profile: {family.name} · {rows.length} competencies
      </p>
    </section>
  );
}

function Rate({ employee, family, row, first, position, total }: { employee: Employee; family: Family; row: GapRow; first: string; position: number; total: number }) {
  const { content, assessments, setRating } = useData();
  const { competency } = row;
  const rating = assessments[employee.id]?.ratings[competency.id];
  const group = content.groups.find((g) => g.id === competency.group)!;
  const options = [{ value: 0, name: "Not yet", text: "Has not worked with this so far." }, ...content.levels.map((l) => ({ value: l.value, name: l.name, text: competency.levels[l.value - 1] }))];
  const columns: { key: "self" | "manager" | "agreed"; label: string }[] = [
    { key: "self", label: first },
    { key: "manager", label: "You" },
    { key: "agreed", label: "Agreed" },
  ];
  const same = rating?.self != null && rating.self === rating.manager;
  const differ = rating?.self != null && rating?.manager != null && rating.self !== rating.manager;

  return (
    <section className="card question">
      <p className="eyebrow">
        {group.name} · {position} of {total}
      </p>
      <h2>{competency.name}</h2>
      <p className="muted">{competency.why}</p>

      <div className="talk">
        <blockquote className="ask">
          <span className="ask-label">Ask</span>
          {competency.question}
        </blockquote>
        {competency.examples[family.id] && (
          <p className="example">
            <span className="ask-label">In {first}’s job, for example</span>
            {competency.examples[family.id]}
          </p>
        )}
      </div>
      {rating?.selfNote && (
        <p className="callout">
          <strong>{first}’s example:</strong> “{rating.selfNote}”
        </p>
      )}

      <table className="rate">
        <thead>
          <tr>
            <th>Which description fits?</th>
            {columns.map((c) => (
              <th key={c.key} className={c.key}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {options.map((option) => (
            <tr key={option.value} className={(option.value === row.target ? "is-target" : "") + (rating?.agreed === option.value ? " is-agreed" : "")}>
              <td>
                <strong>
                  {option.value} {option.name}
                </strong>
                {option.value === row.target && <em className="target-tag">2030 target</em>}
                {option.value === row.baseline && option.value !== row.target && <em className="target-tag today">expected today</em>}
                <span className="sub">{option.text}</span>
              </td>
              {columns.map((c) => (
                <td key={c.key} className={"pickcell " + c.key}>
                  <input
                    type="radio"
                    name={`${competency.id}-${c.key}`}
                    aria-label={`${c.label}: ${option.name}`}
                    checked={rating?.[c.key] === option.value}
                    onChange={() => setRating(employee.id, competency.id, { [c.key]: option.value })}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {same && rating?.agreed == null && (
        <p className="callout ok">
          You both chose “{options[rating!.self!].name}”.{" "}
          <button type="button" className="btn small" onClick={() => setRating(employee.id, competency.id, { agreed: rating!.self! })}>
            Agree on it
          </button>
        </p>
      )}
      {differ && rating?.agreed == null && <p className="callout">Your views differ. Ask for one or two concrete examples, then choose the agreed level together.</p>}

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
}

function Focus({ employee, rows, first }: { employee: Employee; rows: GapRow[]; first: string }) {
  const { content, assessments, assignments, setFocus, assign, setAssignmentStatus, unassign } = useData();
  const { toast } = useUi();
  const focus = assessments[employee.id]?.focus ?? [];
  const assigned = assignments[employee.id] ?? [];
  const open = rows.filter((r) => (r.gap ?? 0) > 0).sort((a, b) => Number(standing(b) === "below") - Number(standing(a) === "below") || (b.gap ?? 0) - (a.gap ?? 0));
  const perPerson = new Set(content.measureTypes.filter((t) => t.perPerson).map((t) => t.id));
  const typeName = (id: string) => content.measureTypes.find((t) => t.id === id)?.name ?? id;
  const toggle = (id: string) => setFocus(employee.id, focus.includes(id) ? focus.filter((f) => f !== id) : [...focus, id]);
  const suggestions = content.measures.filter((m) => perPerson.has(m.type) && !assigned.some((a) => a.measureId === m.id) && m.competencies.some((c) => focus.includes(c)));

  if (agreedCount(rows) < rows.length) {
    return (
      <section className="card question">
        <h2>First agree on all levels.</h2>
        <p className="muted">
          {agreedCount(rows)} of {rows.length} competencies are agreed. Focus areas and measures build on them.
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="card question">
        <p className="eyebrow">Step 1 of 2</p>
        <h2>What does {first} work on first?</h2>
        <p className="muted">
          Choose {MAX_FOCUS} at most. Fewer goals get done; the rest stays visible for next year.
        </p>
        {open.length === 0 ? (
          <p className="callout ok">{first} has reached the 2030 profile. Nothing to close.</p>
        ) : (
          <div className="options">
            {open.map((row) => {
              const on = focus.includes(row.competency.id);
              return (
                <button key={row.competency.id} type="button" className={"option" + (on ? " on" : "")} aria-pressed={on} disabled={!on && focus.length >= MAX_FOCUS} onClick={() => toggle(row.competency.id)}>
                  <span className="option-mark">{on ? "✓" : "+"}</span>
                  <span>
                    <strong>{row.competency.name}</strong>
                    <span className="sub">{standingText(row)}</span>
                  </span>
                  <Steps value={row.agreed} target={row.target} levels={content.levels} compact />
                </button>
              );
            })}
          </div>
        )}
      </section>

      {open.length > 0 && (
        <section className="card flush">
          <header className="card-head">
            <div>
              <p className="eyebrow">Step 2 of 2</p>
              <h2>Which measure helps?</h2>
            </div>
            <span className="card-aside">{assigned.length} agreed</span>
          </header>
          <ul className="rows">
            {assigned.map((a) => {
              const measure = content.measures.find((m) => m.id === a.measureId);
              return (
                measure && (
                  <li key={a.measureId} className="row static">
                    <span className="row-main">
                      <strong>{measure.title}</strong>
                      <span className="sub">
                        {typeName(measure.type)} · agreed {formatDate(a.date)}
                      </span>
                    </span>
                    <select value={a.status} aria-label={`Status of ${measure.title}`} onChange={(event) => setAssignmentStatus(employee.id, a.measureId, event.target.value as AssignmentStatus)}>
                      {STATUS.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="link"
                      onClick={() => {
                        unassign(employee.id, a.measureId);
                        toast("Measure removed");
                      }}
                    >
                      Remove
                    </button>
                  </li>
                )
              );
            })}
            {suggestions.map((measure) => (
              <li key={measure.id} className="row static suggestion">
                <span className="row-main">
                  <strong>{measure.title}</strong>
                  <span className="sub">
                    {typeName(measure.type)} · {measure.description}
                  </span>
                </span>
                <button
                  type="button"
                  className="btn ghost small"
                  onClick={() => {
                    assign(employee.id, measure.id);
                    toast(`Measure agreed with ${first}`);
                  }}
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
          {focus.length === 0 && assigned.length === 0 && <p className="empty">Choose a focus above to see fitting measures.</p>}
        </section>
      )}
    </>
  );
}

function Summary({ employee, rows, first }: { employee: Employee; rows: GapRow[]; first: string }) {
  const { content, assessments, assignments, complete } = useData();
  const { toast } = useUi();
  const assessment = assessments[employee.id];
  const assigned = assignments[employee.id] ?? [];
  const focus = assessment?.focus ?? [];
  const all = agreedCount(rows) === rows.length;
  const completed = assessment?.status === "completed";

  return (
    <section className="card question">
      <p className="eyebrow">{completed ? `Completed on ${formatDate(assessment?.date)}` : "Read it together before you complete"}</p>
      <h2>What you agreed</h2>
      <p className="lead">{summarise(first, rows)}</p>

      <ul className="agreed">
        {rows.map((row) => (
          <li key={row.competency.id}>
            <span>
              <strong>{row.competency.name}</strong>
              {focus.includes(row.competency.id) && <span className="chip focus">Focus</span>}
            </span>
            <Steps value={row.agreed} target={row.target} levels={content.levels} compact />
            <span className="sub">{standingText(row)}</span>
          </li>
        ))}
      </ul>

      <p>
        <strong>Measures:</strong>{" "}
        {assigned.length === 0
          ? "none agreed"
          : assigned.map((a) => content.measures.find((m) => m.id === a.measureId)?.title).filter(Boolean).join(" · ")}
      </p>

      <div className="finish">
        {!all && <span className="muted">{rows.length - agreedCount(rows)} competencies are not agreed yet.</span>}
        <button
          type="button"
          className="btn"
          disabled={!all}
          onClick={() => {
            complete(employee.id);
            toast(`Conversation with ${first} completed`);
            go(`/team/people/${employee.id}`);
          }}
        >
          {completed ? "Save and back to the record" : "Complete the conversation"}
        </button>
      </div>
    </section>
  );
}

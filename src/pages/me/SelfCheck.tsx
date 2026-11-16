import { Steps } from "../../components/Steps";
import { PageHead } from "../../components/Ui";
import { useData } from "../../data";
import { go } from "../../lib/router";
import { useMe } from "./Me";

/** Self-check before the talk: one competency per screen, answered by picking the description that fits. */
export function SelfCheck({ step }: { step?: string }) {
  const { content, setSelf } = useData();
  const { employee, family, team, assessment, rows } = useMe();
  const index = Math.min(Math.max(Number(step) || 1, 1), rows.length + 1);
  const answered = rows.filter((row) => assessment?.ratings[row.competency.id]?.self != null).length;

  if (index > rows.length) {
    return (
      <>
        <PageHead crumbs={[{ label: "My profile", href: "#/me" }, { label: "Self-check" }]} title="That is your self-check" sub={`${answered} of ${rows.length} answered`} />
        <section className="card flush">
          {rows.map((row, i) => {
            const self = assessment?.ratings[row.competency.id]?.self ?? null;
            return (
              <a key={row.competency.id} className="row" href={`#/me/check/${i + 1}`}>
                <span className="row-main">
                  <strong>{row.competency.name}</strong>
                  <span className="sub">{self === null ? "Not answered" : self === 0 ? "Not yet" : content.levels[self - 1].name}</span>
                </span>
                <Steps value={self} target={row.target} levels={content.levels} compact />
                <span className="go" aria-hidden="true">
                  →
                </span>
              </a>
            );
          })}
        </section>
        <div className="finish">
          <span className="muted">
            Saved automatically. {team.manager} sees it in your conversation; you agree on the final levels together.
          </span>
          <button type="button" className="btn" disabled={answered < rows.length} onClick={() => go("/me")}>
            Done
          </button>
        </div>
      </>
    );
  }

  const row = rows[index - 1];
  const { competency } = row;
  const self = assessment?.ratings[competency.id]?.self ?? null;
  const options = [{ value: 0, name: "Not yet", text: "I have not worked with this so far." }, ...content.levels.map((l) => ({ value: l.value, name: l.name, text: competency.levels[l.value - 1] }))];

  return (
    <>
      <PageHead crumbs={[{ label: "My profile", href: "#/me" }, { label: "Self-check" }]} title={competency.name} sub={competency.why} />

      <div className="progress" role="img" aria-label={`Question ${index} of ${rows.length}`}>
        {rows.map((r, i) => (
          <a key={r.competency.id} href={`#/me/check/${i + 1}`} className={i + 1 === index ? "on" : assessment?.ratings[r.competency.id]?.self != null ? "done" : ""} title={r.competency.name} />
        ))}
        <span>
          {index} of {rows.length}
        </span>
      </div>

      <section className="card question">
        {competency.examples[family.id] && (
          <p className="example">
            <span className="ask-label">In your job, for example</span>
            {competency.examples[family.id]}
          </p>
        )}
        <h2>Which description fits you best today?</h2>
        <div className="options" role="radiogroup" aria-label={competency.name}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={self === option.value}
              className={"option" + (self === option.value ? " on" : "")}
              onClick={() => setSelf(employee.id, competency.id, { self: option.value })}
            >
              <span className="option-mark">{option.value}</span>
              <span>
                <strong>{option.name}</strong>
                <span className="sub">{option.text}</span>
              </span>
            </button>
          ))}
        </div>
        <label className="note">
          <span>An example from your work (optional). It makes the conversation easier.</span>
          <textarea
            rows={2}
            maxLength={300}
            value={assessment?.ratings[competency.id]?.selfNote ?? ""}
            placeholder="For example: a task where you used AI, or where you would like to"
            onChange={(event) => setSelf(employee.id, competency.id, { selfNote: event.target.value })}
          />
        </label>
        <p className="muted small">There is no right answer. An honest picture helps you to get the support that fits.</p>
      </section>

      <div className="finish between">
        <a className="btn ghost" href={index === 1 ? "#/me" : `#/me/check/${index - 1}`}>
          Back
        </a>
        <button type="button" className="btn" disabled={self === null} onClick={() => go(`/me/check/${index + 1}`)}>
          {index === rows.length ? "See my answers" : "Next"}
        </button>
      </div>
    </>
  );
}

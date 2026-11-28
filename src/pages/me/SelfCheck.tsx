import { Recommendations } from "../../components/Learning";
import { Steps } from "../../components/Steps";
import { PageHead } from "../../components/Ui";
import { useData } from "../../data";
import { go } from "../../lib/router";
import {
  MAX_MINUTES,
  answerLevels,
  caseLevel,
  casesFor,
  evidenceText,
  progress,
  recommendMeasures,
  rowsForLevels,
  selfCheckItems,
  selfCheckMinutes,
  tasksFor,
  type CheckItem,
} from "../../lib/scoring";
import { useUi } from "../../ui";
import { useMe } from "./Me";

const LETTERS = ["A", "B", "C", "D", "E"];
const CRUMBS = [{ label: "My profile", href: "#/me" }, { label: "Self-check" }];
/** Characters a written answer needs before the next step opens. One is enough, so the flow can be tried quickly in a demo. */
const MIN_TEXT = 1;
const MAX_TEXT = 1200;

/**
 * Self-check of the employee, in two kinds of steps. In a case the employee chooses what comes
 * closest to what they would do; a level follows from the cases of a competency. In a written task
 * the employee describes what they did in a real situation; nothing rates it automatically, the
 * manager reads it in the conversation. The result belongs to the employee and is shared on purpose.
 */
export function SelfCheck({ step }: { step?: string }) {
  const { content } = useData();
  const { family } = useMe();
  const items = selfCheckItems(content, family);
  const number = Number(step);
  if (step === "result") return <Result items={items} />;
  if (!Number.isInteger(number) || number < 1 || number > items.length) return <Intro items={items} />;
  return <Step items={items} number={number} />;
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Tells whether a step is answered: a case has a chosen answer, a task has a text or was left without an example. */
function useAnswered() {
  const { assessment } = useMe();
  return (item: CheckItem) => {
    const rating = assessment?.ratings[item.competency.id];
    return item.kind === "case" ? rating?.selfAnswers?.[item.index] != null : rating?.selfTask !== undefined;
  };
}

function Progress({ items, number }: { items: CheckItem[]; number: number }) {
  const answered = useAnswered();
  return (
    <nav className="progress cases" aria-label="Steps of the self-check">
      {items.map((other, i) => (
        <a
          key={other.task.id}
          href={`#/me/check/${i + 1}`}
          className={(i + 1 === number ? "on" : answered(other) ? "done" : "") + (other.kind === "task" ? " written" : "")}
          aria-current={i + 1 === number ? "step" : undefined}
        >
          <span className="sr-only">
            {other.kind === "task" ? "Written task" : "Case"} {i + 1}: {other.task.title}
          </span>
        </a>
      ))}
      <span>
        {number} of {items.length}
      </span>
    </nav>
  );
}

function Intro({ items }: { items: CheckItem[] }) {
  const { content, setSelf } = useData();
  const { toast } = useUi();
  const { employee, family, team, rows } = useMe();
  const answered = useAnswered();
  const done = items.filter(answered).length;
  const cases = items.filter((item) => item.kind === "case").length;
  const written = items.length - cases;
  const next = items.findIndex((item) => !answered(item));

  // Demo shortcut: answer every step the way one of the personas of the job family would.
  const answerAs = (personaId: string) => {
    const persona = family.personas?.find((p) => p.id === personaId);
    if (!persona) return;
    for (const row of rows) {
      const tasks = casesFor(row.competency, family.id);
      const level = persona.levels[row.competency.id] ?? 0;
      const selfAnswers = tasks.map((task) => Math.max(0, task.options.findIndex((option) => option.level === level)));
      const selfTask = tasksFor(row.competency, family.id).length ? `Demo answer of the persona “${persona.name}”: ${persona.story}` : undefined;
      setSelf(employee.id, row.competency.id, { selfAnswers, self: caseLevel(answerLevels(tasks, selfAnswers)), ...(selfTask ? { selfTask } : {}) });
    }
    toast(`Answered as the persona “${persona.name}”`);
    go("/me/check/result");
  };

  return (
    <>
      <PageHead
        crumbs={CRUMBS}
        title="Self-check"
        sub={`${count(cases, "case", "cases")} and ${count(written, "written task", "written tasks")} from your work in ${rows.length} competencies. About ${selfCheckMinutes(items)} minutes; never more than ${MAX_MINUTES}.`}
      />

      <section className="card question">
        <h2>How it works</h2>
        <ul className="points">
          <li>
            <strong>Cases.</strong> A case describes a situation from a job like yours. You choose what comes closest to what you would do.
          </li>
          <li>
            <strong>Written tasks.</strong> A task asks for something you really did: you describe it in a few sentences. Nothing rates it automatically;{" "}
            {team.manager} reads it in your conversation and you talk about it.
          </li>
          <li>
            <strong>The result is yours.</strong> You see it right away, with ideas for your development. {team.manager} sees it only if you share it.
          </li>
          <li>
            <strong>There is no pass or fail.</strong> It is not used for pay or appraisal. An honest picture gets you the support that fits.
          </li>
        </ul>
        <div className="finish between">
          <span className="muted">
            {done === 0 ? "Saved automatically; you can stop and continue later." : `${done} of ${items.length} steps done. Saved automatically.`}
          </span>
          {next === -1 ? (
            <a className="btn" href="#/me/check/result">
              See my result
            </a>
          ) : (
            <a className="btn" href={`#/me/check/${next + 1}`}>
              {done === 0 ? "Start with the first case" : "Continue"}
            </a>
          )}
        </div>
      </section>

      <section className="card flush">
        <header className="card-head">
          <h2>What it is about</h2>
          <span className="card-aside">{family.name}</span>
        </header>
        <ul className="rows">
          {rows.map((row) => {
            const own = items.filter((item) => item.competency.id === row.competency.id);
            const ownCases = own.filter((item) => item.kind === "case").length;
            const group = content.groups.find((g) => g.id === row.competency.group);
            return (
              <li key={row.competency.id} className="row static">
                <span className="row-main">
                  <strong>{row.competency.name}</strong>
                  <span className="sub">{group?.name}</span>
                </span>
                <span className="row-figure">
                  {count(ownCases, "case", "cases")}
                  {own.length > ownCases && `, ${count(own.length - ownCases, "written task", "written tasks")}`}
                  <span className="sub">about {selfCheckMinutes(own)} min</span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {family.personas && (
        <section className="card demo">
          <p className="eyebrow">Demo shortcut · not part of a real tool</p>
          <p>Fill in the self-check the way an example person of this job family would, and go straight to the result.</p>
          <div className="tabs">
            {family.personas.map((persona) => (
              <button key={persona.id} type="button" className="tab" onClick={() => answerAs(persona.id)} title={persona.story}>
                Answer as {persona.name.toLowerCase()}
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function Step({ items, number }: { items: CheckItem[]; number: number }) {
  const { setSelf } = useData();
  const { employee, family, team, assessment } = useMe();
  const item = items[number - 1];
  const { competency } = item;
  const rating = assessment?.ratings[competency.id];
  const back = number === 1 ? "#/me/check" : `#/me/check/${number - 1}`;
  const onward = number === items.length ? "/me/check/result" : `/me/check/${number + 1}`;
  const onwardLabel = number === items.length ? "See my result" : "Next";

  if (item.kind === "task") {
    const text = rating?.selfTask ?? "";
    return (
      <>
        <PageHead crumbs={CRUMBS} title={item.task.title} sub={`${competency.name} · written task`} />
        <Progress items={items} number={number} />

        <section className="card question">
          <p className="example">
            <span className="ask-label">Your task</span>
            {item.task.task}
          </p>
          <div>
            <p className="self-q" id="task-prompts">
              Describe it in a few sentences
            </p>
            <ul className="points prompts">
              {item.task.prompts.map((prompt) => (
                <li key={prompt}>{prompt}</li>
              ))}
            </ul>
          </div>
          <label className="note">
            <span>Your answer</span>
            <textarea
              rows={7}
              maxLength={MAX_TEXT}
              value={text}
              aria-describedby="task-prompts"
              placeholder="Write what you did, in your own words. Leave out names and confidential details."
              onChange={(event) => setSelf(employee.id, competency.id, { selfTask: event.target.value })}
            />
          </label>
          <p className="counter muted">
            {text.length} of {MAX_TEXT} characters
          </p>
          <p className="muted small">
            Nothing rates this text automatically. If you share your self-check, {team.manager} reads it in your conversation and says which level it shows; you
            agree on the level together.
          </p>
        </section>

        <div className="finish between">
          <a className="btn ghost" href={back}>
            Back
          </a>
          <div className="head-actions">
            <button
              type="button"
              className="link"
              onClick={() => {
                setSelf(employee.id, competency.id, { selfTask: "" });
                go(onward);
              }}
            >
              I have no example yet
            </button>
            <button type="button" className="btn" disabled={text.trim().length < MIN_TEXT} onClick={() => go(onward)}>
              {onwardLabel}
            </button>
          </div>
        </div>
      </>
    );
  }

  const { task } = item;
  const tasks = casesFor(competency, family.id);
  const chosen = rating?.selfAnswers?.[item.index] ?? null;
  // Competencies without a written task keep the optional example after their last case.
  const optionalNote = item.index === item.of - 1 && tasksFor(competency, family.id).length === 0;

  const answer = (option: number) => {
    const selfAnswers = tasks.map((_, i) => (i === item.index ? option : (rating?.selfAnswers?.[i] ?? null)));
    setSelf(employee.id, competency.id, { selfAnswers, self: caseLevel(answerLevels(tasks, selfAnswers)) });
  };

  return (
    <>
      <PageHead crumbs={CRUMBS} title={task.title} sub={`${competency.name} · case ${item.index + 1} of ${item.of}`} />
      <Progress items={items} number={number} />

      <section className="card question">
        <p className="example">
          <span className="ask-label">The situation</span>
          {task.situation}
        </p>
        <fieldset className="options">
          <legend className="self-q">What comes closest to what you would do?</legend>
          {task.options.map((option, value) => (
            <label key={option.text} className={`option${chosen === value ? " on" : ""}`}>
              <input type="radio" className="sr-only" name={`case-${task.id}`} checked={chosen === value} onChange={() => answer(value)} />
              <span className="option-mark">{LETTERS[value]}</span>
              <span className="option-text">{option.text}</span>
            </label>
          ))}
        </fieldset>
        {optionalNote && (
          <label className="note">
            <span>An example from your own work on “{competency.name}” (optional). It makes the conversation easier.</span>
            <textarea
              rows={2}
              maxLength={300}
              value={rating?.selfNote ?? ""}
              placeholder="For example: a task where you did this, or where you would like to"
              onChange={(event) => setSelf(employee.id, competency.id, { selfNote: event.target.value })}
            />
          </label>
        )}
        <p className="muted small">Choose what you would really do, not what sounds best. Nobody sees a single answer but you.</p>
      </section>

      <div className="finish between">
        <a className="btn ghost" href={back}>
          Back
        </a>
        <button type="button" className="btn" disabled={chosen === null} onClick={() => go(onward)}>
          {onwardLabel}
        </button>
      </div>
    </>
  );
}

function Result({ items }: { items: CheckItem[] }) {
  const { content, shareSelf } = useData();
  const { toast } = useUi();
  const { employee, family, team, assessment, rows, shared, completed } = useMe();
  const answered = useAnswered();
  const done = items.filter(answered).length;
  const complete = done === items.length;
  const own = rowsForLevels(content, family, Object.fromEntries(rows.map((row) => [row.competency.id, assessment?.ratings[row.competency.id]?.self])));
  const share = progress(own);
  const ideas = recommendMeasures(content, family, own).slice(0, 3);
  const written = items.filter((item) => item.kind === "task");
  const withText = written.filter((item) => (assessment?.ratings[item.competency.id]?.selfTask ?? "").trim().length > 0).length;

  return (
    <>
      <PageHead crumbs={CRUMBS} title="Your self-check result" sub={`${done} of ${items.length} steps done`} />

      <section className="next">
        {!complete ? (
          <>
            <div>
              <p className="eyebrow">Not finished yet</p>
              <h2>Do the remaining steps to see your full result.</h2>
            </div>
            <a className="btn" href={`#/me/check/${items.findIndex((item) => !answered(item)) + 1}`}>
              Continue
            </a>
          </>
        ) : (
          <>
            <div>
              <p className="eyebrow">For your own development</p>
              <h2>You have reached {Math.round((share ?? 0) * 100)}% of your 2030 profile.</h2>
              <p>
                This follows from your answers to the cases and is yours.{" "}
                {written.length > 0 && `You wrote ${withText} of ${count(written.length, "task", "tasks")}; they are not rated here. `}
                {completed
                  ? `Your levels are already agreed with ${team.manager}.`
                  : shared
                    ? `You have shared it with ${team.manager} for your competency conversation.`
                    : `${team.manager} sees it only if you share it, and then reads what you wrote. In the conversation you agree on the final levels together.`}
              </p>
            </div>
            {!completed &&
              (shared ? (
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => {
                    shareSelf(employee.id, false);
                    toast("Self-check is private again");
                  }}
                >
                  Take it back
                </button>
              ) : (
                <div className="head-actions">
                  <a className="btn ghost" href="#/me">
                    Keep it to myself
                  </a>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      shareSelf(employee.id, true);
                      toast(`Self-check shared with ${team.manager}`);
                      go("/me");
                    }}
                  >
                    Share with {team.manager}
                  </button>
                </div>
              ))}
          </>
        )}
      </section>

      <section className="card flush">
        <header className="card-head">
          <h2>Where your answers put you</h2>
          <span className="card-aside">Level reached in at least two thirds of the cases</span>
        </header>
        {own.map((row) => {
          const tasks = casesFor(row.competency, family.id);
          const levels = answerLevels(tasks, assessment?.ratings[row.competency.id]?.selfAnswers);
          const first = items.findIndex((item) => item.competency.id === row.competency.id);
          const text = assessment?.ratings[row.competency.id]?.selfTask;
          const hasTask = tasksFor(row.competency, family.id).length > 0;
          return (
            <a key={row.competency.id} className="row" href={`#/me/check/${first + 1}`}>
              <span className="row-main">
                <strong>{row.competency.name}</strong>
                <span className="sub">
                  {row.agreed === null
                    ? `${levels.filter((level) => level != null).length} of ${tasks.length} cases answered`
                    : `${row.agreed === 0 ? "Not yet" : content.levels[row.agreed - 1].name} · ${evidenceText(levels)}`}
                  {hasTask && ` · written task: ${text === undefined ? "open" : text.trim() ? "written" : "no example yet"}`}
                </span>
              </span>
              <Steps value={row.agreed} target={row.target} levels={content.levels} compact />
              <span className="go" aria-hidden="true">
                →
              </span>
            </a>
          );
        })}
      </section>

      {complete && (
        <section className="card flush">
          <header className="card-head">
            <h2>Ideas for your development</h2>
            <span className="card-aside">Hints and links; the learning happens outside this tool</span>
          </header>
          <Recommendations list={ideas} empty="Your answers already reach the 2030 profile of your job family." />
          <p className="muted small card-note">
            Entries of VERBUND’s own catalogue are assumed to exist; the links are examples of public courses and videos. Which measure you take is agreed with{" "}
            {team.manager} in the conversation.
          </p>
        </section>
      )}
    </>
  );
}

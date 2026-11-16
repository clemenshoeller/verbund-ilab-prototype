import { standing, standingText, type GapRow } from "../lib/gap";
import type { Content } from "../types";
import { Steps } from "./Steps";

const SHORT = { open: "Open", below: "Below today", steps: "", reached: "Reached" } as const;

/**
 * One competency of a person: the line shows where they stand,
 * opening it shows what the level means in their job and what the next level asks for.
 */
export function CompetencyDetails({
  content,
  row,
  familyId,
  note,
  focus,
  open,
}: {
  content: Content;
  row: GapRow;
  familyId: string;
  note?: string;
  focus?: boolean;
  open?: boolean;
}) {
  const kind = standing(row);
  const toGo = row.target - (row.agreed ?? 0);
  const example = row.competency.examples[familyId];
  const levelText = (level: number) => (level > 0 ? row.competency.levels[level - 1] : "Not yet at the first level.");
  const levelName = (level: number) => content.levels.find((l) => l.value === level)?.name ?? "Not yet";

  return (
    <details className="comp" open={open}>
      <summary>
        <span className="comp-main">
          <strong>{row.competency.name}</strong>
          {focus && <span className="chip focus">Focus</span>}
          <span className="sub">{standingText(row)}</span>
        </span>
        <Steps value={row.agreed} target={row.target} baseline={row.baseline} levels={content.levels} compact />
        <span className={"standing " + kind}>{kind === "steps" ? `${toGo} to go` : SHORT[kind]}</span>
      </summary>
      <div className="comp-body">
        <p>{row.competency.why}</p>
        <dl>
          {example && (
            <>
              <dt>In this job</dt>
              <dd>{example}</dd>
            </>
          )}
          {row.agreed !== null && (
            <>
              <dt>Now: {levelName(row.agreed)}</dt>
              <dd>{levelText(row.agreed)}</dd>
            </>
          )}
          {(row.agreed === null || row.agreed < row.target) && (
            <>
              <dt>2030 target: {levelName(row.target)}</dt>
              <dd>{levelText(row.target)}</dd>
            </>
          )}
          {note && (
            <>
              <dt>Note from the conversation</dt>
              <dd className="quote">“{note}”</dd>
            </>
          )}
        </dl>
      </div>
    </details>
  );
}

/** Headline of a profile: how many competencies are reached, to go, below today's expectation. */
export function GapHeadline({ rows }: { rows: GapRow[] }) {
  const count = (kind: string) => rows.filter((row) => standing(row) === kind).length;
  const parts = [
    { n: count("reached"), label: "reached" },
    { n: count("steps"), label: "to go" },
    { n: count("below"), label: "below today’s expectation" },
    { n: count("open"), label: "not agreed yet" },
  ].filter((part) => part.n > 0);
  return (
    <p className="gap-headline">
      {parts.map((part) => (
        <span key={part.label}>
          <strong>{part.n}</strong> {part.label}
        </span>
      ))}
    </p>
  );
}

import { CompetencyDetails, GapHeadline } from "../../components/CompetencyDetails";
import { ProfileRadar } from "../../components/Radar";
import { StepsLegend } from "../../components/Steps";
import { Avatar, Card, LinkTabs, NotFound, PageHead, StageChip, formatDate } from "../../components/Ui";
import { useData } from "../../data";
import { activeFocus, gapRows, standing, summarise, type GapRow } from "../../lib/gap";
import { selfCheckDone, stageOf } from "../../lib/workflow";
import type { Employee } from "../../types";
import { Conversation } from "./Conversation";

const STATUS_LABEL = { planned: "Planned", running: "Running", done: "Done" } as const;

/** The record of one team member: where they stand, the conversation, and what happened. */
export function Person({ employeeId, tab = "overview", step }: { employeeId: string; tab?: string; step?: string }) {
  const { content, team, assessments, assignments } = useData();
  const employee = team.employees.find((e) => e.id === employeeId);
  if (!employee) {
    return <NotFound what="Person" back="#/team/people" backLabel="People" />;
  }

  const family = content.families.find((f) => f.id === employee.family)!;
  const assessment = assessments[employee.id];
  const assigned = assignments[employee.id] ?? [];
  const rows = gapRows(content, family, assessment);
  const stage = stageOf(content, employee, assessment, assigned);
  const base = `#/team/people/${employee.id}`;
  const active = ["overview", "conversation", "activity"].includes(tab) ? tab : "overview";
  const resume = rows.find((r) => r.agreed === null)?.competency.id ?? "summary";

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
                {employee.role} · {family.name}
              </span>
            </span>
          </span>
        }
        actions={
          <>
            <StageChip stage={stage} />
            {active !== "conversation" &&
              (stage === "open" ? (
                <a className="btn" href={`${base}/conversation`}>
                  Start the conversation
                </a>
              ) : stage === "talking" ? (
                <a className="btn" href={`${base}/conversation/${resume}`}>
                  Continue the conversation
                </a>
              ) : stage === "agreed" ? (
                <a className="btn" href={`${base}/conversation/focus`}>
                  Agree measures
                </a>
              ) : null)}
          </>
        }
      />

      <LinkTabs
        active={active}
        tabs={[
          { id: "overview", label: "Overview", href: `${base}/overview` },
          { id: "conversation", label: "Conversation", href: `${base}/conversation` },
          { id: "activity", label: "Activity", href: `${base}/activity` },
        ]}
      />

      {active === "overview" && <Overview employee={employee} rows={rows} />}
      {active === "conversation" && <Conversation employee={employee} family={family} rows={rows} step={step} />}
      {active === "activity" && <Activity employee={employee} />}
    </>
  );
}

function Overview({ employee, rows }: { employee: Employee; rows: GapRow[] }) {
  const { content, assessments, assignments } = useData();
  const assessment = assessments[employee.id];
  const assigned = assignments[employee.id] ?? [];
  const focus = activeFocus(rows, assessment?.focus);
  const first = employee.name.split(" ")[0];
  const completed = assessment?.status === "completed";
  const prepared = selfCheckDone(content, employee, assessment);
  const order = { below: 0, steps: 1, open: 2, reached: 3 };
  const sorted = [...rows].sort((a, b) => order[standing(a)] - order[standing(b)] || (b.gap ?? 0) - (a.gap ?? 0));

  return (
    <>
      <section className="next plain">
        <div>
          <p className="eyebrow">{completed ? `Agreed on ${formatDate(assessment?.date)}` : "Not agreed yet"}</p>
          <h2>
            {completed
              ? summarise(first, rows)
              : assessment?.status === "in-progress"
                ? `The conversation with ${first} is running.`
                : prepared
                  ? `${first} has done the self-check and is ready for the conversation.`
                  : `${first} has not done the self-check yet.`}
          </h2>
        </div>
      </section>

      <div className="grid-2-1">
        <Card title="Profile" aside={<GapHeadline rows={rows} />} flush>
          <ProfileRadar
            rows={rows}
            levels={content.levels}
            levelLabel="Agreed level"
            self={prepared ? { label: `${first}’s self-check`, values: rows.map((r) => assessment?.ratings[r.competency.id]?.self ?? null) } : undefined}
            title={`${first}’s profile against the 2030 target`}
          />
          {sorted.map((row) => (
            <CompetencyDetails
              key={row.competency.id}
              content={content}
              row={row}
              familyId={employee.family}
              note={assessment?.ratings[row.competency.id]?.note}
              focus={focus.includes(row.competency.id)}
            />
          ))}
          <div className="card-note">
            <StepsLegend />
          </div>
        </Card>

        <div className="stack">
          <SeenDifferently employee={employee} rows={rows} />
          <Card title="Development plan" aside={completed ? <a href={`#/team/people/${employee.id}/conversation/focus`}>Change</a> : undefined}>
            {!completed ? (
              <p className="muted">Focus areas and measures are chosen at the end of the conversation.</p>
            ) : (
              <>
                <p className="plan-label">Focus</p>
                {focus.length === 0 ? (
                  <p className="muted">No focus chosen.</p>
                ) : (
                  <ul className="plan">
                    {focus.map((id) => (
                      <li key={id}>{content.competencies.find((c) => c.id === id)?.name}</li>
                    ))}
                  </ul>
                )}
                <p className="plan-label">Measures</p>
                {assigned.length === 0 ? (
                  <p className="muted">No measure agreed yet.</p>
                ) : (
                  <ul className="plan">
                    {assigned.map((a) => (
                      <li key={a.measureId}>
                        {content.measures.find((m) => m.id === a.measureId)?.title}
                        <span className={"chip status-" + a.status}>{STATUS_LABEL[a.status]}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

/** Competencies where the self-check and the manager's view were apart: worth a second look. */
function SeenDifferently({ employee, rows }: { employee: Employee; rows: GapRow[] }) {
  const { content, assessments } = useData();
  const ratings = assessments[employee.id]?.ratings ?? {};
  const first = employee.name.split(" ")[0];
  const rated = rows.filter((r) => ratings[r.competency.id]?.self != null && ratings[r.competency.id]?.manager != null);
  if (rated.length === 0) return null;
  const apart = rated.filter((r) => ratings[r.competency.id].self !== ratings[r.competency.id].manager);
  const name = (value: number | null) => (value === null ? "open" : value === 0 ? "Not yet" : content.levels[value - 1].name);

  return (
    <Card title="Seen differently" aside={`${apart.length} of ${rated.length}`} flush>
      {apart.length === 0 ? (
        <p className="empty">You and {first} chose the same level in every competency you rated.</p>
      ) : (
        <ul className="rows">
          {apart.map((row) => {
            const r = ratings[row.competency.id];
            const higher = (r.self as number) > (r.manager as number);
            return (
              <li key={row.competency.id}>
                <a className="row" href={`#/team/people/${employee.id}/conversation/${row.competency.id}`}>
                  <span className="row-main">
                    <strong>{row.competency.name}</strong>
                    <span className="sub">
                      {first}: {name(r.self)} · You: {name(r.manager)}
                    </span>
                    <span className="sub">
                      Agreed: {name(r.agreed)}
                      <span className={"chip " + (higher ? "self-higher" : "self-lower")}>{higher ? `${first} higher` : `${first} lower`}</span>
                    </span>
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function Activity({ employee }: { employee: Employee }) {
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
    if (measure) events.push({ date: a.date, text: `Measure agreed: ${measure.title}`, detail: STATUS_LABEL[a.status] });
  }
  events.sort((a, b) => b.date.localeCompare(a.date));

  return (
    <Card title="Activity" flush>
      {events.length === 0 ? (
        <p className="empty">Nothing recorded yet.</p>
      ) : (
        <ol className="timeline">
          {events.map((event) => (
            <li key={`${event.date} ${event.text}`}>
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

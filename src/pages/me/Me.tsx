import { CompetencyDetails, GapHeadline } from "../../components/CompetencyDetails";
import { CourseLinks, TaskTable } from "../../components/Learning";
import { StepsLegend } from "../../components/Steps";
import { Card, PageHead, formatDate } from "../../components/Ui";
import { useData } from "../../data";
import { activeFocus, gapRows } from "../../lib/gap";
import { go } from "../../lib/router";
import { MIN_GROUP } from "../../lib/metrics";
import { progress, selfCheckItems, selfCheckMinutes } from "../../lib/scoring";
import { selfCheckDone, selfShared } from "../../lib/workflow";
import { useUi } from "../../ui";

/** The demo employee, with the data every page of the employee role needs. */
export function useMe() {
  const { content, org, assessments, assignments } = useData();
  const employee = org.employees.find((e) => e.id === org.currentEmployeeId) ?? org.employees[0];
  const family = content.families.find((f) => f.id === employee.family)!;
  const team = org.teams.find((t) => t.id === employee.team)!;
  const assessment = assessments[employee.id];
  const rows = gapRows(content, family, assessment);
  return {
    employee,
    family,
    team,
    assessment,
    rows,
    measures: assignments[employee.id] ?? [],
    completed: assessment?.status === "completed",
    prepared: selfCheckDone(content, employee, assessment),
    /** False while the employee keeps the self-check private. */
    shared: selfShared(assessment),
  };
}

export function MyProfile() {
  const { content, shareSelf } = useData();
  const { toast } = useUi();
  const { employee, family, team, assessment, rows, measures, completed, prepared, shared } = useMe();
  const first = employee.name.split(" ")[0];
  const items = selfCheckItems(content, family);
  const written = items.filter((item) => item.kind === "task").length;
  const reached = progress(rows);
  // Before the conversation the profile shows the own self-check, afterwards the agreed levels.
  const shown = completed ? rows : rows.map((row) => ({ ...row, agreed: assessment?.ratings[row.competency.id]?.self ?? null, gap: null }));
  const focus = activeFocus(rows, assessment?.focus);

  return (
    <>
      <PageHead title={`Hello ${first}`} sub={`${employee.role} · ${family.name} · ${team.name}`} />

      <section className="next">
        {completed ? (
          <>
            <div>
              <p className="eyebrow">Agreed on {formatDate(assessment?.date)}</p>
              <h2>Your levels are agreed with {team.manager}.</h2>
              <p>
                {reached !== null && `You have reached ${Math.round(reached * 100)}% of your 2030 profile. `}They stay valid until next year’s conversation. You can
                see below what you are working on.
              </p>
            </div>
          </>
        ) : prepared && shared ? (
          <>
            <div>
              <p className="eyebrow">Your next step</p>
              <h2>Your self-check is with {team.manager}.</h2>
              <p>You will go through it together in your yearly appraisal talk and agree on one level per competency.</p>
            </div>
            <a className="btn ghost" href="#/me/check/result">
              See my result
            </a>
          </>
        ) : prepared ? (
          <>
            <div>
              <p className="eyebrow">Your self-check is done</p>
              <h2>The result is yours. Share it when you are ready.</h2>
              <p>
                {team.manager} sees it only if you share it. Sharing makes the competency conversation shorter; you agree on the final levels
                together either way.
              </p>
            </div>
            <div className="head-actions">
              <a className="btn ghost" href="#/me/check/result">
                See my result
              </a>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  shareSelf(employee.id, true);
                  toast(`Self-check shared with ${team.manager}`);
                }}
              >
                Share with {team.manager}
              </button>
            </div>
          </>
        ) : (
          <>
            <div>
              <p className="eyebrow">Your next step · about {selfCheckMinutes(items)} minutes</p>
              <h2>Find out where you stand, with cases and tasks from your work.</h2>
              <p>
                {items.length - written} short cases and {written} written tasks in {rows.length} competencies. The result is yours: you get ideas for your development right away, and{" "}
                {team.manager} sees it only if you share it. It is not used for pay or appraisal.
              </p>
            </div>
            <button type="button" className="btn" onClick={() => go("/me/check")}>
              Start the self-check
            </button>
          </>
        )}
      </section>

      <Card
        title={completed ? "Where you stand" : prepared ? "Your self-check" : `Your target profile: ${family.name}`}
        aside={completed ? <GapHeadline rows={rows} /> : `${rows.length} competencies`}
        flush
      >
        {shown.map((row) => (
          <CompetencyDetails
            key={row.competency.id}
            content={content}
            row={row}
            familyId={family.id}
            note={completed ? assessment?.ratings[row.competency.id]?.note : undefined}
            subText={
              completed
                ? undefined
                : row.agreed === null
                  ? `2030 target: ${content.levels.find((l) => l.value === row.target)?.name}`
                  : `Your self-check: ${row.agreed === 0 ? "Not yet" : content.levels[row.agreed - 1].name}`
            }
            focus={focus.includes(row.competency.id)}
          />
        ))}
        <div className="card-note">
          <StepsLegend />
        </div>
      </Card>

      {completed && (
        <Card title="What you are working on" aside={`${measures.length} ${measures.length === 1 ? "measure" : "measures"}`} flush>
          {measures.length === 0 ? (
            <p className="empty">No measure agreed yet. {team.manager} will choose it together with you.</p>
          ) : (
            <ul className="rows">
              {measures.map((a) => {
                const measure = content.measures.find((m) => m.id === a.measureId);
                return (
                  measure && (
                    <li key={a.measureId} className="row static">
                      <span className="row-main">
                        <strong>{measure.title}</strong>
                        <span className="sub">{measure.description}</span>
                        <CourseLinks courses={measure.courses} />
                      </span>
                      <span className={"chip status-" + a.status}>{a.status === "planned" ? "Planned" : a.status === "running" ? "Running" : "Done"}</span>
                    </li>
                  )
                );
              })}
            </ul>
          )}
        </Card>
      )}

      {family.tasks && (
        <Card title="How your job changes until 2030" aside={`${family.tasks.length} common tasks in ${family.name}`} flush>
          <TaskTable content={content} family={family} needs={false} />
          <p className="muted small card-note">Your target profile follows from these tasks: each competency is needed at the level the most demanding task asks for.</p>
        </Card>
      )}
    </>
  );
}

export function MyData() {
  const { team, employee } = useMe();
  const rowsWho = [
    { who: "You", sees: "Everything that is stored about you: self-check, agreed levels, notes, measures." },
    { who: `Your manager (${team.manager})`, sees: "Agreed levels, notes and measures, for the members of the own team only. Your self-check only if you share it." },
    { who: "HR and the digital unit", sees: `Totals per job family and team. Groups with fewer than ${MIN_GROUP} rated employees are not shown. No names.` },
    { who: "Everyone else", sees: "Nothing." },
  ];
  return (
    <>
      <PageHead title="My data" sub="What is stored about you, who sees it, and what it is used for." />

      <div className="grid-1-1">
        <Card title="What it is for">
          <ul className="rules">
            <li>Your development: which AI competencies you build next, and with which measure.</li>
            <li>Planning of training offers across the company, from totals.</li>
            <li>It is not used for pay, appraisal or staffing decisions.</li>
          </ul>
        </Card>
        <Card title="What is stored">
          <ul className="rules">
            <li>Your answers to the cases of the self-check, the level that follows from them, and what you wrote in the written tasks.</li>
            <li>The level agreed per competency in the conversation.</li>
            <li>Notes from the conversation, if you and your manager write any.</li>
            <li>Measures agreed with you and their status.</li>
            <li>No usage data from AI tools, no results from other tests.</li>
          </ul>
        </Card>
      </div>

      <Card title="Who sees what" flush>
        <div className="table-wrap">
          <table className="table">
            <tbody>
              {rowsWho.map((row) => (
                <tr key={row.who}>
                  <td>
                    <strong>{row.who}</strong>
                  </td>
                  <td>{row.sees}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small card-note">
          Proposal of the student team. In a real tool these rules would be agreed with the works council; correcting or deleting entries of{" "}
          {employee.name.split(" ")[0]} would be possible here and is not built in the prototype.
        </p>
      </Card>
    </>
  );
}

import { CompetencyDetails, GapHeadline } from "../../components/CompetencyDetails";
import { StepsLegend } from "../../components/Steps";
import { Card, PageHead, formatDate } from "../../components/Ui";
import { useData } from "../../data";
import { activeFocus, gapRows } from "../../lib/gap";
import { go } from "../../lib/router";
import { MIN_GROUP } from "../../lib/metrics";
import { selfCheckDone } from "../../lib/workflow";

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
  };
}

export function MyProfile() {
  const { content } = useData();
  const { employee, family, team, assessment, rows, measures, completed, prepared } = useMe();
  const first = employee.name.split(" ")[0];
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
              <p>They stay valid until next year’s conversation. You can see below what you are working on.</p>
            </div>
          </>
        ) : prepared ? (
          <>
            <div>
              <p className="eyebrow">Your next step</p>
              <h2>Your self-check is with {team.manager}.</h2>
              <p>You will go through it together in your yearly appraisal talk and agree on one level per competency.</p>
            </div>
            <a className="btn ghost" href="#/me/check">
              Change my self-check
            </a>
          </>
        ) : (
          <>
            <div>
              <p className="eyebrow">Your next step · about 5 minutes</p>
              <h2>Prepare for your competency conversation.</h2>
              <p>
                Pick the description that fits you best in {rows.length} competencies. Only you and {team.manager} see your answers; they are not
                used for pay or appraisal.
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
    </>
  );
}

export function MyData() {
  const { team, employee } = useMe();
  const rowsWho = [
    { who: "You", sees: "Everything that is stored about you: self-check, agreed levels, notes, measures." },
    { who: `Your manager (${team.manager})`, sees: "The same, for the members of the own team only." },
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
            <li>Your self-check and the level agreed per competency.</li>
            <li>Notes from the conversation, if you and your manager write any.</li>
            <li>Measures agreed with you and their status.</li>
            <li>No test results, no usage data from AI tools.</li>
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

import { Avatar, PageHead } from "../../components/Ui";
import { useData } from "../../data";
import { agreedCount, gapRows, totalGap } from "../../lib/gap";
import { STAGES, selfCheckDone, stageOf } from "../../lib/workflow";
import { useUi } from "../../ui";

/** Board with one column per stage; a card moves to the right as the work on a person progresses. */
export function Pipeline() {
  const { content, team, assessments, assignments } = useData();
  const { openDrawer } = useUi();
  const cards = team.employees.map((employee) => {
    const family = content.families.find((f) => f.id === employee.family)!;
    const assessment = assessments[employee.id];
    const rows = gapRows(content, family, assessment);
    return {
      employee,
      family,
      rows,
      stage: stageOf(content, employee, assessment, assignments[employee.id]),
      measures: assignments[employee.id]?.length ?? 0,
    };
  });

  return (
    <>
      <PageHead
        title="Pipeline"
        sub="Every team member moves from the self-check to agreed measures. Click a card for the preview and the next step."
      />
      <div className="board">
        {STAGES.map((stage) => {
          const inStage = cards.filter((card) => card.stage === stage.id);
          return (
            <section key={stage.id} className="column" aria-label={stage.name}>
              <header>
                <strong>{stage.name}</strong>
                <span className="badge">{inStage.length}</span>
                <span className="sub">{stage.hint}</span>
              </header>
              {inStage.length === 0 && <p className="empty">No one here</p>}
              {inStage.map(({ employee, family, rows, measures }) => {
                const gap = totalGap(rows);
                const prepared = selfCheckDone(content, employee, assessments[employee.id]);
                return (
                  <button key={employee.id} type="button" className="kcard" onClick={() => openDrawer({ type: "person", id: employee.id })}>
                    <span className="kcard-head">
                      <Avatar name={employee.name} small />
                      <span>
                        <strong>{employee.name}</strong>
                        <span className="sub">{employee.role}</span>
                      </span>
                    </span>
                    <span className="chip">{family.name}</span>
                    <span className="kcard-foot">
                      {stage.id === "open" && (prepared ? "Self-check is in · ready to talk" : "Self-check not done yet")}
                      {stage.id === "talking" && `${agreedCount(rows)} of ${rows.length} agreed`}
                      {stage.id === "agreed" && `${gap} steps to 2030 · agree measures`}
                      {stage.id === "planned" && (gap ? `${gap} steps to 2030 · ${measures} ${measures === 1 ? "measure" : "measures"}` : "2030 profile reached")}
                    </span>
                  </button>
                );
              })}
            </section>
          );
        })}
      </div>
    </>
  );
}

import { useEffect, useRef, type ReactNode } from "react";
import { useData } from "../data";
import { activeFocus, gapRows, standingText, summarise } from "../lib/gap";
import { MIN_GROUP, competencyStats, familyGrid, kpis, measureReach, percent, tooFew } from "../lib/metrics";
import { measureUptake, selfCheckShared, stageOf } from "../lib/workflow";
import { useUi, type DrawerSpec } from "../ui";
import { Meter } from "./Figures";
import { CompetencyMeters } from "./HiddenStats";
import { Icon } from "./Icon";
import { Steps } from "./Steps";
import { Avatar, StageChip, formatDate } from "./Ui";

/** Preview of a record that slides in from the right; the full record is one click away. */
export function Drawer() {
  const { drawer, closeDrawer } = useUi();
  const close = useRef<HTMLButtonElement>(null);
  const isOpen = drawer !== null;
  useEffect(() => {
    if (!isOpen) return;
    const before = document.activeElement as HTMLElement | null;
    // While the preview is open, the page behind it cannot be reached by keyboard or screen reader.
    const behind = [...document.querySelectorAll<HTMLElement>(".app > .side, .app > .main")];
    for (const element of behind) element.inert = true;
    close.current?.focus({ preventScroll: true });
    return () => {
      for (const element of behind) element.inert = false;
      // preventScroll: giving the focus back must not move the page (Safari leaves it on the heading, which sits at the top).
      before?.focus?.({ preventScroll: true });
    };
  }, [isOpen]);
  if (!drawer) return null;
  return (
    <div className="drawer-layer">
      <button type="button" className="drawer-shade" aria-label="Close preview" onClick={closeDrawer} />
      <div className="drawer" role="dialog" aria-modal="true" aria-label="Preview">
        <button ref={close} type="button" className="icon-btn drawer-close" aria-label="Close" onClick={closeDrawer}>
          <Icon name="close" />
        </button>
        <Content spec={drawer} />
      </div>
    </div>
  );
}

function Content({ spec }: { spec: DrawerSpec }) {
  switch (spec.type) {
    case "person":
      return <PersonPreview id={spec.id} />;
    case "team":
      return <TeamPreview id={spec.id} />;
    case "competency":
      return <CompetencyPreview id={spec.id} />;
    case "cell":
      return <CellPreview familyId={spec.familyId} competencyId={spec.competencyId} />;
  }
}

/** How far a measure is in use; not shown when it would fit fewer than five people. */
function uptakeText(assigned: number, reach: number): string {
  return tooFew(reach) ? `would fit fewer than ${MIN_GROUP} employees` : `agreed for ${assigned} of ${reach} it would fit`;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="drawer-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <span>
      <em>{label}</em>
      <strong>{value}</strong>
    </span>
  );
}

function PersonPreview({ id }: { id: string }) {
  const { content, team, assessments, assignments } = useData();
  const employee = team.employees.find((e) => e.id === id);
  if (!employee) return <p className="empty">Not found.</p>;
  const family = content.families.find((f) => f.id === employee.family)!;
  const assessment = assessments[employee.id];
  const assigned = assignments[employee.id] ?? [];
  const rows = gapRows(content, family, assessment);
  const stage = stageOf(content, employee, assessment, assigned);
  const focus = activeFocus(rows, assessment?.focus);
  const first = employee.name.split(" ")[0];
  const base = `#/team/people/${employee.id}`;
  const resume = rows.find((r) => r.agreed === null)?.competency.id ?? "summary";
  const completed = assessment?.status === "completed";
  const action =
    stage === "open"
      ? { label: "Start the conversation", href: `${base}/conversation` }
      : stage === "talking"
        ? { label: "Continue the conversation", href: `${base}/conversation/${resume}` }
        : stage === "agreed"
          ? { label: "Agree measures", href: `${base}/conversation/focus` }
          : null;

  return (
    <>
      <div className="drawer-head">
        <Avatar name={employee.name} />
        <div>
          <h2>{employee.name}</h2>
          <p className="sub">
            {employee.role} · {family.name}
          </p>
        </div>
      </div>
      <p className="drawer-stage">
        <StageChip stage={stage} />
        {assessment?.date && <span className="sub">last change {formatDate(assessment.date)}</span>}
      </p>
      <p className="drawer-lead">
        {completed
          ? summarise(first, rows)
          : assessment?.status === "in-progress"
            ? `The conversation with ${first} is running.`
            : selfCheckShared(content, employee, assessment)
              ? `${first} has done the self-check and is ready for the conversation.`
              : `${first} has not shared a self-check yet.`}
      </p>

      <Section title="Profile">
        <ul className="mini-rows">
          {rows.map((row) => (
            <li key={row.competency.id}>
              <span>
                {row.competency.name}
                <span className="sub">{standingText(row)}</span>
              </span>
              <Steps value={row.agreed} target={row.target} levels={content.levels} compact />
            </li>
          ))}
        </ul>
      </Section>

      {completed && (
        <Section title="Development plan">
          {assigned.length === 0 && focus.length === 0 ? (
            <p className="muted">No focus and no measure yet.</p>
          ) : (
            <ul className="mini-rows">
              {focus.map((f) => (
                <li key={f}>
                  <span>
                    {content.competencies.find((c) => c.id === f)?.name}
                    <span className="sub">Focus</span>
                  </span>
                </li>
              ))}
              {assigned.map((a) => (
                <li key={a.measureId}>
                  <span>
                    {content.measures.find((m) => m.id === a.measureId)?.title}
                    <span className="sub">Measure · {a.status}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      <div className="drawer-foot">
        {action && (
          <a className="btn" href={action.href}>
            {action.label}
          </a>
        )}
        <a className={"btn" + (action ? " ghost" : "")} href={base}>
          Open the full record
        </a>
      </div>
    </>
  );
}

function TeamPreview({ id }: { id: string }) {
  const { content, org, assessments, assignments } = useData();
  const team = org.teams.find((t) => t.id === id);
  if (!team) return <p className="empty">Not found.</p>;
  const members = org.employees.filter((e) => e.team === team.id);
  const k = kpis(content, members, assessments);
  const visible = k.completed >= MIN_GROUP;
  const stats = competencyStats(content, members, assessments);
  const withMeasures = members.filter((e) => (assignments[e.id] ?? []).length > 0).length;

  return (
    <>
      <div className="drawer-head">
        <span className="avatar">
          <Icon name="team" />
        </span>
        <div>
          <h2>{team.name}</h2>
          <p className="sub">
            {team.manager} · {members.length} employees
          </p>
        </div>
      </div>
      <div className="facts stacked">
        <Fact label="Conversations done" value={`${k.completed} of ${k.headcount}`} />
        <Fact label="Fit for today" value={visible ? `${k.readyToday} of ${k.completed}` : `n<${MIN_GROUP}`} />
        <Fact label="With measures" value={visible ? withMeasures : `n<${MIN_GROUP}`} />
      </div>
      <Section title="Reaching the 2030 target, by competency">
        {visible ? (
          <CompetencyMeters stats={stats} />
        ) : (
          <p className="muted">Fewer than {MIN_GROUP} rated employees. Results appear once more conversations are done.</p>
        )}
      </Section>
      <div className="drawer-foot">
        <a className="btn" href={`#/hr/teams/${team.id}`}>
          Open the team
        </a>
      </div>
    </>
  );
}

function CompetencyPreview({ id }: { id: string }) {
  const { content, org, assessments, assignments } = useData();
  const stat = competencyStats(content, org.employees, assessments).find((s) => s.competency.id === id);
  if (!stat) return <p className="empty">Not found.</p>;
  const { competency } = stat;
  const measures = content.measures.filter((m) => m.competencies.includes(id));
  const grid = familyGrid(content, org.employees, assessments, "target").filter((row) => row.cells[id]);

  return (
    <>
      <div className="drawer-head">
        <span className="avatar">
          <Icon name="layers" />
        </span>
        <div>
          <h2>{competency.name}</h2>
          <p className="sub">{content.groups.find((g) => g.id === competency.group)?.name}</p>
        </div>
      </div>
      <p className="drawer-lead">{competency.why}</p>
      <div className="facts stacked">
        <Fact label="Rated" value={stat.rated} />
        <Fact label="Meet today’s expectation" value={stat.hidden ? `n<${MIN_GROUP}` : percent(1 - stat.belowToday / stat.rated)} />
        <Fact label="Reach the 2030 target" value={stat.hidden ? `n<${MIN_GROUP}` : percent(1 - stat.belowTarget / stat.rated)} />
      </div>
      <Section title="Reaching the 2030 target, by job family">
        <div className="meters">
          {grid.map((row) => {
            const cell = row.cells[id]!;
            return cell.hidden ? (
              <p key={row.family.id} className="muted small">
                {row.family.name}: fewer than {MIN_GROUP} rated
              </p>
            ) : (
              <Meter key={row.family.id} name={row.family.name} value={cell.reached} of={cell.assessed} />
            );
          })}
        </div>
      </Section>
      <Section title="Measures that build it">
        <ul className="mini-rows">
          {measures.map((m) => (
            <li key={m.id}>
              <span>
                {m.title}
                <span className="sub">{uptakeText(measureUptake(org.employees, assignments, m.id).assigned, measureReach(content, org.employees, assessments, m))}</span>
              </span>
            </li>
          ))}
        </ul>
      </Section>
      <div className="drawer-foot">
        <a className="btn" href={`#/hr/competencies/${id}`}>
          Open the competency
        </a>
      </div>
    </>
  );
}

function CellPreview({ familyId, competencyId }: { familyId: string; competencyId: string }) {
  const { content, org, assessments, assignments } = useData();
  const family = content.families.find((f) => f.id === familyId);
  const competency = content.competencies.find((c) => c.id === competencyId);
  if (!family || !competency) return <p className="empty">Not found.</p>;
  const entry = family.profile[competencyId];
  const today = familyGrid(content, org.employees, assessments, "baseline").find((r) => r.family.id === familyId)?.cells[competencyId];
  const target = familyGrid(content, org.employees, assessments, "target").find((r) => r.family.id === familyId)?.cells[competencyId];
  const members = org.employees.filter((e) => e.family === familyId);
  const measures = content.measures.filter((m) => m.competencies.includes(competencyId));
  const levelName = (level: number) => content.levels.find((l) => l.value === level)?.name ?? "Not required yet";

  return (
    <>
      <div className="drawer-head">
        <span className="avatar">
          <Icon name="chart" />
        </span>
        <div>
          <h2>{competency.name}</h2>
          <p className="sub">in {family.name}</p>
        </div>
      </div>
      {!target || !today || target.hidden ? (
        <p className="drawer-lead">Fewer than {MIN_GROUP} rated employees. Results are not shown for groups this small.</p>
      ) : (
        <>
          <p className="drawer-lead">
            {today.reached} of {today.assessed} rated employees meet today’s expectation, {target.reached} already reach the 2030 target.
          </p>
          <div className="facts stacked">
            <Fact label="Expected today" value={levelName(entry.baseline)} />
            <Fact label="Target 2030" value={levelName(entry.target)} />
            <Fact label="Steps missing in total" value={target.missingLevels} />
          </div>
        </>
      )}
      <Section title="What the 2030 level means">
        <p>{competency.levels[entry.target - 1]}</p>
        {competency.examples[familyId] && <p className="muted">In this job family, for example: {competency.examples[familyId]}</p>}
      </Section>
      <Section title="Measures that fit">
        <ul className="mini-rows">
          {measures.map((m) => (
            <li key={m.id}>
              <span>
                {m.title}
                <span className="sub">
                  {content.measureTypes.find((t) => t.id === m.type)?.perPerson
                    ? uptakeText(measureUptake(members, assignments, m.id).assigned, measureReach(content, members, assessments, m))
                    : "for the organisation"}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Section>
      <div className="drawer-foot">
        <a className="btn" href={`#/hr/competencies/${competencyId}`}>
          Open the competency
        </a>
        <a className="btn ghost" href={`#/hr/profiles/${familyId}`}>
          Open the job family
        </a>
      </div>
    </>
  );
}

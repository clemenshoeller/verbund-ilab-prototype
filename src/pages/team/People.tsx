import { useState } from "react";
import { Avatar, Card, PageHead, StageChip, formatDate } from "../../components/Ui";
import { TeamToggle } from "./Pipeline";
import { useData } from "../../data";
import { gapRows, totalGap } from "../../lib/gap";
import { queryParam } from "../../lib/router";
import { useUi } from "../../ui";
import { STAGES, stageOf } from "../../lib/workflow";

type SortKey = "name" | "stage" | "gap";

export function People() {
  const { content, team, assessments, assignments } = useData();
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("all");
  // The address may carry a stage filter; anything unknown counts as "all".
  const [stage, setStage] = useState(() => {
    const wanted = queryParam("stage");
    return STAGES.some((s) => s.id === wanted) ? (wanted as string) : "all";
  });
  const { openDrawer } = useUi();
  const [sort, setSort] = useState<SortKey>("stage");

  const all = team.employees.map((employee) => {
    const fam = content.families.find((f) => f.id === employee.family)!;
    const assessment = assessments[employee.id];
    const rows = gapRows(content, fam, assessment);
    return {
      employee,
      family: fam,
      rows,
      gap: assessment?.status === "completed" ? totalGap(rows) : null,
      stage: stageOf(content, employee, assessment, assignments[employee.id]),
      measures: assignments[employee.id]?.length ?? 0,
      date: assessment?.date ?? null,
    };
  });

  const term = query.trim().toLowerCase();
  const order = STAGES.map((s) => s.id);
  const list = all
    .filter((p) => (family === "all" || p.family.id === family) && (stage === "all" || p.stage === stage))
    .filter((p) => !term || `${p.employee.name} ${p.employee.role}`.toLowerCase().includes(term))
    .sort((a, b) =>
      sort === "name"
        ? a.employee.name.localeCompare(b.employee.name)
        : sort === "gap"
          ? (b.gap ?? -1) - (a.gap ?? -1)
          : order.indexOf(a.stage) - order.indexOf(b.stage),
    );

  const head = (key: SortKey, label: string, num?: boolean) => (
    <th className={num ? "num" : ""} aria-sort={sort === key ? (key === "gap" ? "descending" : "ascending") : undefined}>
      <button type="button" className={"sort" + (sort === key ? " on" : "")} onClick={() => setSort(key)}>
        {label}
      </button>
    </th>
  );

  return (
    <>
      <PageHead title="Team" sub={`${team.info.name}: ${all.length} team members`} actions={<TeamToggle active="list" />} />
      <Card flush>
        <div className="filters">
          <input type="search" value={query} placeholder="Filter by name or role" aria-label="Filter by name or role" onChange={(e) => setQuery(e.target.value)} />
          <label>
            Job family
            <select value={family} onChange={(e) => setFamily(e.target.value)}>
              <option value="all">All</option>
              {content.families.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Stage
            <select value={stage} onChange={(e) => setStage(e.target.value)}>
              <option value="all">All</option>
              {STAGES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <span className="count">
            {list.length} of {all.length}
          </span>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                {head("name", "Name")}
                <th>Job family</th>
                {head("stage", "Stage")}
                {head("gap", "Steps to 2030", true)}
                <th>Last change</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.employee.id} className="clickable" onClick={() => openDrawer({ type: "person", id: p.employee.id })}>
                  <td>
                    <span className="person">
                      <Avatar name={p.employee.name} small />
                      <span>
                        <button
                      type="button"
                      className="rowlink"
                      onClick={(event) => {
                        event.stopPropagation();
                        openDrawer({ type: "person", id: p.employee.id });
                      }}
                    >
                      {p.employee.name}
                    </button>
                        <span className="sub">{p.employee.role}</span>
                      </span>
                    </span>
                  </td>
                  <td>{p.family.name}</td>
                  <td>
                    <StageChip stage={p.stage} />
                  </td>
                  <td className="num">{p.gap ?? "–"}</td>
                  <td>{formatDate(p.date)}</td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty">
                    No team member matches the filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

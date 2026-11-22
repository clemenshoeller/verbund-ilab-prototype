import type { Assessment, Assessments, Assignment, Assignments, Content, Employee } from "../types";
import { agreedCount, gapRows, totalGap } from "./gap";

/** Where a person stands in the process, from first talk to agreed measures. */
export type Stage = "open" | "talking" | "agreed" | "planned";

export const STAGES: { id: Stage; name: string; hint: string }[] = [
  { id: "open", name: "Not started", hint: "No conversation yet" },
  { id: "talking", name: "In conversation", hint: "Levels not agreed for all competencies" },
  { id: "agreed", name: "Levels agreed", hint: "Gaps are known, measures still open" },
  { id: "planned", name: "Measures agreed", hint: "Measures chosen, or no gap to close" },
];

export const stageName = (stage: Stage) => STAGES.find((s) => s.id === stage)!.name;

export function stageOf(content: Content, employee: Employee, assessment?: Assessment, assigned: Assignment[] = []): Stage {
  if (!assessment || assessment.status === "open") return "open";
  if (assessment.status === "in-progress") return "talking";
  const family = content.families.find((f) => f.id === employee.family)!;
  const gap = totalGap(gapRows(content, family, assessment)) ?? 0;
  return gap === 0 || assigned.length > 0 ? "planned" : "agreed";
}

/** True once the employee has rated themself in every competency of the profile. */
/**
 * Self-assessed level from the answers to a competency's questions: the average, rounded down,
 * so the self-check never rounds anyone up. Null until every question is answered.
 */
export function selfLevel(answers: (number | null)[], questions: number): number | null {
  if (questions === 0 || answers.length < questions) return null;
  const given = answers.slice(0, questions);
  if (given.some((a) => a == null)) return null;
  return Math.floor((given as number[]).reduce((sum, a) => sum + a, 0) / questions);
}

export function selfCheckDone(content: Content, employee: Employee, assessment?: Assessment): boolean {
  const family = content.families.find((f) => f.id === employee.family)!;
  const rows = gapRows(content, family, assessment);
  return rows.length > 0 && rows.every((row) => assessment?.ratings[row.competency.id]?.self != null);
}

export interface NextAction {
  employee: Employee;
  stage: Stage;
  /** What to do, e.g. "Agree measures". */
  label: string;
  detail: string;
  href: string;
}

/**
 * What the manager should do next, most advanced cases first:
 * finish running conversations, then agree measures, then start new conversations.
 */
export function nextActions(content: Content, employees: Employee[], assessments: Assessments, assignments: Assignments): NextAction[] {
  const actions: NextAction[] = [];
  for (const employee of employees) {
    const assessment = assessments[employee.id];
    const stage = stageOf(content, employee, assessment, assignments[employee.id]);
    const family = content.families.find((f) => f.id === employee.family)!;
    const rows = gapRows(content, family, assessment);
    if (stage === "talking") {
      actions.push({
        employee,
        stage,
        label: "Finish the conversation",
        detail: `${agreedCount(rows)} of ${rows.length} competencies agreed`,
        href: `#/team/people/${employee.id}/conversation/${rows.find((r) => r.agreed === null)?.competency.id ?? "summary"}`,
      });
    } else if (stage === "agreed") {
      const gap = totalGap(rows) ?? 0;
      actions.push({
        employee,
        stage,
        label: "Agree measures",
        detail: `${gap} ${gap === 1 ? "step" : "steps"} to the 2030 target, no measure yet`,
        href: `#/team/people/${employee.id}/conversation/focus`,
      });
    } else if (stage === "open") {
      actions.push({
        employee,
        stage,
        label: "Start the conversation",
        detail: selfCheckDone(content, employee, assessment) ? "Self-check is in" : "Self-check not done yet",
        href: `#/team/people/${employee.id}/conversation`,
      });
    }
  }
  const order: Stage[] = ["talking", "agreed", "open", "planned"];
  return actions.sort((a, b) => order.indexOf(a.stage) - order.indexOf(b.stage));
}

/** How often a measure was agreed, across the given people. */
export function measureUptake(employees: Employee[], assignments: Assignments, measureId: string) {
  let assigned = 0;
  let done = 0;
  for (const employee of employees) {
    const hit = (assignments[employee.id] ?? []).find((a) => a.measureId === measureId);
    if (!hit) continue;
    assigned++;
    if (hit.status === "done") done++;
  }
  return { assigned, done };
}

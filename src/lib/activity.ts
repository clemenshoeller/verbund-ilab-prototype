import type { Assessments, Assignments, Content, Employee } from "../types";

export interface ActivityEvent {
  date: string;
  employee: Employee;
  text: string;
  href: string;
}

/** The latest things that happened in a group of people, newest first. */
export function recentActivity(content: Content, employees: Employee[], assessments: Assessments, assignments: Assignments, limit = 6): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  for (const employee of employees) {
    const href = `#/team/people/${employee.id}/activity`;
    const assessment = assessments[employee.id];
    if (assessment?.date) {
      events.push({
        date: assessment.date,
        employee,
        text: assessment.status === "completed" ? "Conversation completed" : "Conversation started",
        href,
      });
    }
    for (const a of assignments[employee.id] ?? []) {
      const measure = content.measures.find((m) => m.id === a.measureId);
      if (measure) events.push({ date: a.date, employee, text: `Measure agreed: ${measure.title}`, href });
    }
  }
  return events.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

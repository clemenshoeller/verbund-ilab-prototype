import type { Assessments, Competency, Content, Employee, Family, Measure, Org, TeamInfo } from "../types";

/** "baseline" = the level expected today, "target" = the level expected in 2030. */
export type Horizon = "baseline" | "target";

/** HR sees aggregates only; groups smaller than this are hidden. */
export const MIN_GROUP = 5;

/** One agreed rating of one person in one competency of the own profile. */
export interface Pair {
  employeeId: string;
  family: string;
  competencyId: string;
  agreed: number;
  baseline: number;
  target: number;
}

export const isCompleted = (assessments: Assessments, employeeId: string) =>
  assessments[employeeId]?.status === "completed";

/** All agreed ratings from completed conversations. Open and running conversations do not count. */
export function ratedPairs(content: Content, employees: Employee[], assessments: Assessments): Pair[] {
  const families = new Map(content.families.map((f) => [f.id, f]));
  const pairs: Pair[] = [];
  for (const employee of employees) {
    if (!isCompleted(assessments, employee.id)) continue;
    const family = families.get(employee.family);
    if (!family) continue;
    for (const [competencyId, entry] of Object.entries(family.profile)) {
      if (entry.target <= 0) continue;
      const agreed = assessments[employee.id].ratings[competencyId]?.agreed;
      if (agreed === null || agreed === undefined) continue;
      pairs.push({ employeeId: employee.id, family: family.id, competencyId, agreed, baseline: entry.baseline, target: entry.target });
    }
  }
  return pairs;
}

export const missing = (pair: Pair, horizon: Horizon) => Math.max(0, pair[horizon] - pair.agreed);

export interface Kpis {
  headcount: number;
  completed: number;
  inProgress: number;
  /** Share of ratings at or above the 2030 target, 0 to 1; null without ratings. */
  atTargetShare: number | null;
  /** Sum of levels missing to the 2030 target. */
  missingLevels: number;
  /** Assessed people with at least one competency below today's level. */
  belowTodayPeople: number;
  /** Competency with the most missing levels to 2030, if any. */
  largestGap: Competency | null;
  /** Assessed people who meet today's expectation in every competency of their profile. */
  readyToday: number;
}

export function kpis(content: Content, employees: Employee[], assessments: Assessments): Kpis {
  const pairs = ratedPairs(content, employees, assessments);
  const perCompetency = new Map<string, number>();
  const belowToday = new Set<string>();
  let atTarget = 0;
  let missingLevels = 0;
  for (const pair of pairs) {
    const gap = missing(pair, "target");
    if (gap === 0) atTarget++;
    missingLevels += gap;
    perCompetency.set(pair.competencyId, (perCompetency.get(pair.competencyId) ?? 0) + gap);
    if (missing(pair, "baseline") > 0) belowToday.add(pair.employeeId);
  }
  const top = [...perCompetency.entries()].sort((a, b) => b[1] - a[1])[0];
  return {
    headcount: employees.length,
    completed: employees.filter((e) => isCompleted(assessments, e.id)).length,
    inProgress: employees.filter((e) => assessments[e.id]?.status === "in-progress").length,
    atTargetShare: pairs.length ? atTarget / pairs.length : null,
    missingLevels,
    belowTodayPeople: belowToday.size,
    readyToday: new Set(pairs.map((p) => p.employeeId)).size - belowToday.size,
    largestGap: top && top[1] > 0 ? (content.competencies.find((c) => c.id === top[0]) ?? null) : null,
  };
}

export interface Cell {
  /** People with an agreed rating in this cell. */
  assessed: number;
  /** People below the chosen horizon. */
  below: number;
  /** below / assessed, 0 to 1. */
  share: number;
  /** Sum of missing levels to the chosen horizon. */
  missingLevels: number;
  /** True if the group is too small to be shown. */
  hidden: boolean;
}

export interface GridRow {
  family: Family;
  headcount: number;
  assessed: number;
  /** Per competency; null = not part of the family's profile. */
  cells: Record<string, Cell | null>;
}

/** Job family by competency, for the chosen horizon. */
export function familyGrid(content: Content, employees: Employee[], assessments: Assessments, horizon: Horizon): GridRow[] {
  const pairs = ratedPairs(content, employees, assessments);
  return content.families.map((family) => {
    const members = employees.filter((e) => e.family === family.id);
    const cells: Record<string, Cell | null> = {};
    for (const competency of content.competencies) {
      if ((family.profile[competency.id]?.target ?? 0) <= 0) {
        cells[competency.id] = null;
        continue;
      }
      const own = pairs.filter((p) => p.family === family.id && p.competencyId === competency.id);
      const below = own.filter((p) => missing(p, horizon) > 0).length;
      cells[competency.id] = {
        assessed: own.length,
        below,
        share: own.length ? below / own.length : 0,
        missingLevels: own.reduce((sum, p) => sum + missing(p, horizon), 0),
        hidden: own.length < MIN_GROUP,
      };
    }
    return {
      family,
      headcount: members.length,
      assessed: members.filter((e) => isCompleted(assessments, e.id)).length,
      cells,
    };
  });
}

export interface Priority {
  family: Family;
  competency: Competency;
  assessed: number;
  belowToday: number;
  belowTarget: number;
  missingLevels: number;
}

/**
 * Gaps in the order they should be worked on: first what is below today's level (urgency),
 * then the number of levels missing to 2030 (size). Hidden groups and cells without a gap are left out.
 */
export function priorities(content: Content, employees: Employee[], assessments: Assessments): Priority[] {
  const today = familyGrid(content, employees, assessments, "baseline");
  const target = familyGrid(content, employees, assessments, "target");
  const rows: Priority[] = [];
  target.forEach((row, index) => {
    for (const competency of content.competencies) {
      const cell = row.cells[competency.id];
      const todayCell = today[index].cells[competency.id];
      if (!cell || !todayCell || cell.hidden || cell.missingLevels === 0) continue;
      rows.push({
        family: row.family,
        competency,
        assessed: cell.assessed,
        belowToday: todayCell.below,
        belowTarget: cell.below,
        missingLevels: cell.missingLevels,
      });
    }
  });
  return rows.sort((a, b) => b.belowToday - a.belowToday || b.missingLevels - a.missingLevels);
}

export interface Coverage {
  team: TeamInfo;
  headcount: number;
  completed: number;
}

export function teamCoverage(org: Org, assessments: Assessments): Coverage[] {
  return org.teams
    .map((team) => {
      const members = org.employees.filter((e) => e.team === team.id);
      return { team, headcount: members.length, completed: members.filter((e) => isCompleted(assessments, e.id)).length };
    })
    .sort((a, b) => b.completed / b.headcount - a.completed / a.headcount);
}

/** Assessed people with a gap to 2030 in at least one competency the measure addresses. */
export function measureReach(content: Content, employees: Employee[], assessments: Assessments, measure: Measure): number {
  const people = new Set<string>();
  for (const pair of ratedPairs(content, employees, assessments)) {
    if (measure.competencies.includes(pair.competencyId) && missing(pair, "target") > 0) people.add(pair.employeeId);
  }
  return people.size;
}

export const percent = (share: number | null) => (share === null ? "–" : `${Math.round(share * 100)}%`);

export interface CompetencyStats {
  competency: Competency;
  /** People with an agreed rating in this competency. */
  rated: number;
  belowToday: number;
  belowTarget: number;
  missingLevels: number;
  /** How many people were rated at level 0, 1, 2, 3. */
  distribution: number[];
}

/** One row per competency for the given people, across all job families that need it. */
export function competencyStats(content: Content, employees: Employee[], assessments: Assessments): CompetencyStats[] {
  const pairs = ratedPairs(content, employees, assessments);
  return content.competencies.map((competency) => {
    const own = pairs.filter((p) => p.competencyId === competency.id);
    const distribution = [0, 0, 0, 0];
    for (const pair of own) distribution[pair.agreed]++;
    return {
      competency,
      rated: own.length,
      belowToday: own.filter((p) => missing(p, "baseline") > 0).length,
      belowTarget: own.filter((p) => missing(p, "target") > 0).length,
      missingLevels: own.reduce((sum, p) => sum + missing(p, "target"), 0),
      distribution,
    };
  });
}

/**
 * The key figures as they stood at the end of each of the last weeks, oldest first.
 * Built from the dates of the completed conversations, so the trend is real for the data shown.
 */
export function kpiHistory(content: Content, employees: Employee[], assessments: Assessments, points = 8): Kpis[] {
  const dates = employees.map((e) => assessments[e.id]).filter((a) => a?.status === "completed" && a.date).map((a) => a.date as string);
  if (dates.length === 0) return [];
  const end = new Date(dates.sort()[dates.length - 1] + "T00:00:00Z");
  const history: Kpis[] = [];
  for (let i = points - 1; i >= 0; i--) {
    const cutoff = new Date(end.getTime() - i * 7 * 86400000).toISOString().slice(0, 10);
    const until: Assessments = {};
    for (const employee of employees) {
      const a = assessments[employee.id];
      if (a?.status === "completed" && a.date && a.date <= cutoff) until[employee.id] = a;
    }
    history.push(kpis(content, employees, until));
  }
  return history;
}

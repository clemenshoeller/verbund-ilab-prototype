import type { CaseTask, Competency, Content, Family, Measure, WorkTask } from "../types";
import { gapTo, profileCompetencies, type GapRow } from "./gap";

/** Upper limit for the whole self-check, agreed with VERBUND in the jour fixe of 24.11.2026. */
export const MAX_MINUTES = 40;

/** Cases of a competency that are written for the given job family. */
export function casesFor(competency: Competency, familyId: string): CaseTask[] {
  return (competency.cases ?? []).filter((task) => !task.families || task.families.includes(familyId));
}

export interface CaseRef {
  competency: Competency;
  task: CaseTask;
  /** Position of the case within its competency, starting at 0. */
  index: number;
  /** Number of cases of that competency. */
  of: number;
}

/** Every case of a family's self-check, competency by competency, in the order of the content file. */
export function selfCheckCases(content: Content, family: Family): CaseRef[] {
  return profileCompetencies(content, family).flatMap((competency) => {
    const tasks = casesFor(competency, family.id);
    return tasks.map((task, index) => ({ competency, task, index, of: tasks.length }));
  });
}

/** Written tasks of a competency that are meant for the given job family. */
export function tasksFor(competency: Competency, familyId: string): WorkTask[] {
  return (competency.tasks ?? []).filter((task) => !task.families || task.families.includes(familyId));
}

/** One step of the self-check: a case to answer by choosing, or a task to answer in writing. */
export type CheckItem = ({ kind: "case" } & CaseRef) | { kind: "task"; competency: Competency; task: WorkTask };

/** The whole self-check of a family: per competency first its cases, then its written task. */
export function selfCheckItems(content: Content, family: Family): CheckItem[] {
  return profileCompetencies(content, family).flatMap((competency) => {
    const cases = casesFor(competency, family.id);
    return [
      ...cases.map((task, index): CheckItem => ({ kind: "case", competency, task, index, of: cases.length })),
      ...tasksFor(competency, family.id).map((task): CheckItem => ({ kind: "task", competency, task })),
    ];
  });
}

export const selfCheckMinutes = (items: { task: { minutes: number } }[]) => items.reduce((sum, item) => sum + item.task.minutes, 0);

/** The level each chosen option shows; null where a case is not answered. */
export function answerLevels(tasks: CaseTask[], answers: (number | null)[] | undefined): (number | null)[] {
  return tasks.map((task, i) => {
    const chosen = answers?.[i];
    return chosen == null ? null : (task.options[chosen]?.level ?? null);
  });
}

/**
 * Level a person shows across the cases of one competency: the highest level reached in at least
 * two thirds of the cases. One strong answer cannot lift the result, and with three or more cases
 * one weak answer cannot sink it. Null until every case is answered.
 */
export function caseLevel(levels: (number | null)[]): number | null {
  if (levels.length === 0 || levels.some((level) => level == null)) return null;
  const shown = levels as number[];
  const needed = Math.ceil((shown.length * 2) / 3);
  for (let level = Math.max(...shown); level >= 1; level--) {
    if (shown.filter((l) => l >= level).length >= needed) return level;
  }
  return 0;
}

/** How far the answers of one competency are apart, in levels. Two or more is worth a question in the conversation. */
export function spread(levels: (number | null)[]): number {
  const shown = levels.filter((level): level is number => level != null);
  return shown.length ? Math.max(...shown) - Math.min(...shown) : 0;
}

/** The evidence behind a self-check level, in the words shown to employee and manager. */
export function evidenceText(levels: (number | null)[]): string {
  const answered = levels.filter((level) => level != null).length;
  if (answered === 0) return "Not answered";
  if (answered === 1) return "1 case";
  const apart = spread(levels);
  return apart >= 2 ? `${answered} cases, answers ${apart} levels apart` : `${answered} cases, consistent`;
}

/**
 * Share of the levels the 2030 profile asks for that are already reached, from 0 to 1.
 * A level above the target counts as the target, so strength in one competency cannot hide a gap in another.
 * Null without a rating.
 */
export function progress(rows: { agreed: number | null; target: number }[]): number | null {
  const rated = rows.filter((row) => row.agreed !== null && row.target > 0);
  const wanted = rated.reduce((sum, row) => sum + row.target, 0);
  if (wanted === 0) return null;
  return rated.reduce((sum, row) => sum + Math.min(row.agreed as number, row.target), 0) / wanted;
}

export interface PathPoint {
  year: number;
  /** Share of the 2030 profile planned for the end of that year, 0 to 1. */
  planned: number;
  /** Share measured in that year; null for years that lie ahead. */
  measured: number | null;
}

/** The planned way from the first measurement to the full 2030 profile, in equal steps per year. */
export function pathTo2030(measured: number, startYear = 2026, endYear = 2030): PathPoint[] {
  const points: PathPoint[] = [];
  for (let year = startYear; year <= endYear; year++) {
    const planned = measured + ((1 - measured) * (year - startYear)) / (endYear - startYear);
    points.push({ year, planned, measured: year === startYear ? measured : null });
  }
  return points;
}

export interface Recommendation {
  measure: Measure;
  /** Weight of the most urgent competency the measure builds. */
  score: number;
  /** Competencies with a gap that the measure builds, most urgent first. */
  closes: GapRow[];
}

/**
 * Measures for one person, best fit first. Every open competency gets a weight: the levels missing
 * to 2030, plus two if the person is below today's expectation, plus three if it is a chosen focus area.
 * A measure ranks by the most urgent competency it builds; among equals, trainings come before
 * organisational measures, foundations before later competencies, and then the measure that closes more.
 * Measures of the organisation and measures for other job families are left out.
 */
export function recommendMeasures(content: Content, family: Family, rows: GapRow[], focus: string[] = []): Recommendation[] {
  const types = content.measureTypes.map((type) => type.id);
  const perPerson = new Set(content.measureTypes.filter((type) => type.perPerson).map((type) => type.id));
  const order = content.competencies.map((competency) => competency.id);
  const open = rows.filter((row) => (row.gap ?? 0) > 0);
  const weight = (row: GapRow) => (row.gap ?? 0) + ((row.agreed ?? 0) < row.baseline ? 2 : 0) + (focus.includes(row.competency.id) ? 3 : 0);
  return content.measures
    .filter((measure) => perPerson.has(measure.type) && (!measure.families || measure.families.includes(family.id)))
    .map((measure) => {
      const closes = open.filter((row) => measure.competencies.includes(row.competency.id)).sort((a, b) => weight(b) - weight(a));
      return { measure, closes, score: closes.length ? weight(closes[0]) : 0, total: closes.reduce((sum, row) => sum + weight(row), 0) };
    })
    .filter((rec) => rec.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        types.indexOf(a.measure.type) - types.indexOf(b.measure.type) ||
        order.indexOf(a.closes[0].competency.id) - order.indexOf(b.closes[0].competency.id) ||
        b.total - a.total,
    )
    .map(({ measure, closes, score }) => ({ measure, closes, score }));
}

/** Gap rows of a profile for given levels (a persona, or a self-check before the conversation). */
export function rowsForLevels(content: Content, family: Family, levels: Record<string, number | null | undefined>): GapRow[] {
  return profileCompetencies(content, family).map((competency) => {
    const entry = family.profile[competency.id];
    const agreed = levels[competency.id] ?? null;
    return { competency, baseline: entry.baseline, target: entry.target, agreed, gap: gapTo(entry.target, agreed) };
  });
}

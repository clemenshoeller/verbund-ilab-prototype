import type { Assessment, AssessmentStatus, Competency, Content, Family } from "../types";

export interface GapRow {
  competency: Competency;
  baseline: number;
  target: number;
  /** Agreed level from the conversation; null while not agreed. */
  agreed: number | null;
  /** Levels missing to the 2030 target; null while not agreed. Never negative. */
  gap: number | null;
}

/** Levels missing to the target. Being above target counts as no gap. */
export function gapTo(target: number, agreed: number | null | undefined): number | null {
  if (agreed === null || agreed === undefined) return null;
  return Math.max(0, target - agreed);
}

/** Competencies that belong to a family's profile, in the order of the content file. */
export function profileCompetencies(content: Content, family: Family): Competency[] {
  return content.competencies.filter((c) => (family.profile[c.id]?.target ?? 0) > 0);
}

export function gapRows(content: Content, family: Family, assessment?: Assessment): GapRow[] {
  return profileCompetencies(content, family).map((competency) => {
    const entry = family.profile[competency.id];
    const agreed = assessment?.ratings[competency.id]?.agreed ?? null;
    return { competency, baseline: entry.baseline, target: entry.target, agreed, gap: gapTo(entry.target, agreed) };
  });
}

/** Sum of all gaps; null if nothing has been agreed yet. */
export function totalGap(rows: GapRow[]): number | null {
  const known = rows.filter((r) => r.gap !== null);
  if (known.length === 0) return null;
  return known.reduce((sum, r) => sum + (r.gap as number), 0);
}

export function agreedCount(rows: GapRow[]): number {
  return rows.filter((r) => r.agreed !== null).length;
}

export function statusOf(assessment?: Assessment): AssessmentStatus {
  return assessment?.status ?? "open";
}

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

/** How one competency stands, in the words shown to users. */
export type Standing = "open" | "below" | "steps" | "reached";

export function standing(row: GapRow): Standing {
  if (row.agreed === null) return "open";
  if (row.agreed < row.baseline) return "below";
  return row.agreed >= row.target ? "reached" : "steps";
}

export function standingText(row: GapRow): string {
  switch (standing(row)) {
    case "open":
      return "Not agreed yet";
    case "below":
      return "Below today’s expectation";
    case "reached":
      return "2030 target reached";
    default: {
      const steps = row.target - (row.agreed ?? 0);
      return `${steps} ${steps === 1 ? "step" : "steps"} to the 2030 target`;
    }
  }
}

/** One or two sentences that say where a person stands, for the top of a record. */
export function summarise(name: string, rows: GapRow[]): string {
  const rated = rows.filter((r) => r.agreed !== null);
  if (rated.length === 0) return `${name} has no agreed levels yet.`;
  const below = rated.filter((r) => standing(r) === "below");
  const reached = rated.filter((r) => standing(r) === "reached").length;
  const steps = rated.reduce((sum, r) => sum + (r.gap ?? 0), 0);
  const largest = [...rated].sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0))[0];
  const today =
    below.length === 0
      ? `${name} meets today’s expectations in all ${rated.length} competencies.`
      : `${name} is below today’s expectation in ${below.length} of ${rated.length} competencies, first of all “${below[0].competency.name}”.`;
  const future =
    steps === 0
      ? "The 2030 profile is already reached."
      : `For 2030, ${reached} of ${rated.length} are reached; the largest step is in “${largest.competency.name}”.`;
  return `${today} ${future}`;
}

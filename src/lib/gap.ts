import type { Assessment, Competency, Content, Employee, Family } from "../types";

/**
 * The profile a person is measured against: the job family, or, for someone with a role profile,
 * the job family with the targets and tasks of the role added.
 */
export function familyOf(content: Content, employee: Employee): Family | undefined {
  return content.personal?.[employee.id] ?? content.families.find((f) => f.id === employee.family);
}

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
  const steps = rated.reduce((sum, r) => sum + (r.gap ?? 0), 0);
  const open = rated.filter((r) => (r.gap ?? 0) > 0);
  const sorted = [...open].sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0));
  // Name a competency only if it clearly stands out.
  const largest = sorted.length > 0 && (sorted.length === 1 || sorted[0].gap !== sorted[1].gap) ? sorted[0] : null;
  const today =
    below.length === 0
      ? `${name} meets today’s expectations in all ${rated.length} competencies.`
      : `${name} is below today’s expectation in ${below.length} of ${rated.length} competencies, first of all “${below[0].competency.name}”.`;
  const future =
    steps === 0
      ? "The 2030 profile is already reached."
      : `For 2030, ${steps} ${steps === 1 ? "step is" : "steps are"} still to go in ${open.length} of ${rated.length} competencies` +
        (largest ? `, most in “${largest.competency.name}”.` : ".");
  return `${today} ${future}`;
}

/** Focus areas that still have a gap. A focus whose gap was closed later no longer counts. */
export function activeFocus(rows: GapRow[], focus: string[] | undefined): string[] {
  return (focus ?? []).filter((id) => rows.some((row) => row.competency.id === id && (row.gap ?? 0) > 0));
}

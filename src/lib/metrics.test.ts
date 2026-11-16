import { describe, expect, it } from "vitest";
import contentJson from "../data/content.json";
import orgJson from "../data/org.json";
import type { Assessment, Assessments, Content, Employee, Org } from "../types";
import { MIN_GROUP, competencyStats, familyGrid, kpis, measureReach, priorities, ratedPairs, teamCoverage } from "./metrics";

const content = contentJson as unknown as Content;
const org = orgJson as unknown as Org;

/** Family D: targets 2, 2, 2, 1 and baselines 1, 1, 1, 0 for the four non-leadership competencies. */
const IDS = ["safe-use", "check-results", "spot-potential", "build-scale"];
function person(id: string, levels: number[], status: Assessment["status"] = "completed") {
  const employee: Employee = { id, name: id, role: "Tester", family: "D", team: "x" };
  const ratings = Object.fromEntries(IDS.map((c, i) => [c, { self: levels[i], manager: levels[i], agreed: levels[i], note: "" }]));
  return { employee, assessment: { status, date: "2026-11-01", ratings } as Assessment };
}
function build(people: ReturnType<typeof person>[]) {
  const employees = people.map((p) => p.employee);
  const assessments: Assessments = Object.fromEntries(people.map((p) => [p.employee.id, p.assessment]));
  return { employees, assessments };
}

describe("kpis", () => {
  const { employees, assessments } = build([
    person("a", [2, 2, 2, 1]), // at target everywhere
    person("b", [1, 1, 1, 0]), // at today's level, one level short everywhere
    person("c", [0, 2, 2, 1]), // below today's level in one competency
    person("d", [0, 0, 0, 0], "in-progress"), // must not count
  ]);
  const result = kpis(content, employees, assessments);

  it("counts conversations by status", () => {
    expect(result.headcount).toBe(4);
    expect(result.completed).toBe(3);
    expect(result.inProgress).toBe(1);
  });
  it("uses completed conversations only", () => {
    expect(ratedPairs(content, employees, assessments)).toHaveLength(12);
  });
  it("computes the share at target and the missing levels", () => {
    expect(result.atTargetShare).toBeCloseTo(7 / 12);
    expect(result.missingLevels).toBe(4 + 2);
    expect(result.belowTodayPeople).toBe(1);
    expect(result.readyToday).toBe(2);
    expect(result.largestGap?.id).toBe("safe-use");
  });
  it("returns no share without ratings", () => {
    expect(kpis(content, employees, {}).atTargetShare).toBeNull();
  });
});

describe("familyGrid", () => {
  const five = build([1, 2, 3, 4, 5].map((n) => person(`p${n}`, n <= 2 ? [1, 2, 2, 1] : [2, 2, 2, 1])));
  it("gives the share below the horizon", () => {
    const row = familyGrid(content, five.employees, five.assessments, "target").find((r) => r.family.id === "D")!;
    expect(row.assessed).toBe(5);
    expect(row.cells["safe-use"]).toMatchObject({ assessed: 5, below: 2, share: 0.4, missingLevels: 2, hidden: false });
    expect(row.cells["steer-use"]).toBeNull();
  });
  it("sees no gap to today's level when everyone is at baseline", () => {
    const row = familyGrid(content, five.employees, five.assessments, "baseline").find((r) => r.family.id === "D")!;
    expect(row.cells["safe-use"]?.below).toBe(0);
  });
  it("hides groups below the minimum size", () => {
    const four = build([1, 2, 3, 4].map((n) => person(`p${n}`, [0, 0, 0, 0])));
    const row = familyGrid(content, four.employees, four.assessments, "target").find((r) => r.family.id === "D")!;
    expect(MIN_GROUP).toBe(5);
    expect(row.cells["safe-use"]?.hidden).toBe(true);
    expect(priorities(content, four.employees, four.assessments)).toHaveLength(0);
  });
});

describe("priorities", () => {
  it("puts gaps below today's level first, then the larger gap", () => {
    const { employees, assessments } = build([
      person("a", [0, 1, 2, 1]),
      person("b", [0, 1, 2, 1]),
      person("c", [2, 1, 2, 1]),
      person("d", [2, 0, 2, 1]),
      person("e", [2, 1, 2, 0]),
    ]);
    const rows = priorities(content, employees, assessments);
    expect(rows.map((r) => r.competency.id)).toEqual(["safe-use", "check-results", "build-scale"]);
    expect(rows[0]).toMatchObject({ assessed: 5, belowToday: 2, belowTarget: 2, missingLevels: 4 });
    expect(rows[1]).toMatchObject({ belowToday: 1, belowTarget: 5, missingLevels: 6 });
  });
});

describe("measureReach", () => {
  it("counts each person once", () => {
    const { employees, assessments } = build([person("a", [2, 2, 1, 0]), person("b", [2, 2, 2, 1])]);
    const measure = content.measures.find((m) => m.competencies.includes("spot-potential") && m.competencies.includes("build-scale"))!;
    expect(measureReach(content, employees, assessments, measure)).toBe(1);
  });
});

describe("sample organisation", () => {
  it("has a coverage row per team that adds up", () => {
    const rows = teamCoverage(org, org.assessments);
    expect(rows).toHaveLength(org.teams.length);
    expect(rows.reduce((sum, r) => sum + r.headcount, 0)).toBe(org.employees.length);
  });
  it("shows every job family in the HR view", () => {
    const grid = familyGrid(content, org.employees, org.assessments, "target");
    expect(grid.every((row) => row.assessed >= MIN_GROUP)).toBe(true);
  });
  it("only links measures to known competencies and types", () => {
    const competencies = new Set(content.competencies.map((c) => c.id));
    const types = new Set(content.measureTypes.map((t) => t.id));
    for (const m of content.measures) {
      expect(types.has(m.type)).toBe(true);
      expect(m.competencies.every((c) => competencies.has(c))).toBe(true);
    }
  });
});

describe("competencyStats", () => {
  it("counts ratings per level and the people below each horizon", () => {
    const { employees, assessments } = build([person("a", [0, 2, 2, 1]), person("b", [1, 2, 2, 1]), person("c", [2, 2, 2, 1])]);
    const safe = competencyStats(content, employees, assessments).find((s) => s.competency.id === "safe-use")!;
    expect(safe).toMatchObject({ rated: 3, belowToday: 1, belowTarget: 2, missingLevels: 3, distribution: [1, 1, 1, 0] });
    const lead = competencyStats(content, employees, assessments).find((s) => s.competency.id === "steer-use")!;
    expect(lead.rated).toBe(0);
  });
});

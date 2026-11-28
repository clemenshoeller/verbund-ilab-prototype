import { describe, expect, it } from "vitest";
import contentJson from "../data/content.json";
import orgJson from "../data/org.json";
import type { Assessment, Assessments, Content, Employee, Org } from "../types";
import { MIN_GROUP, competencyStats, familyGrid, kpiHistory, kpis, measureReach, priorities, ratedPairs, roleOverview, teamCoverage, teamGrid } from "./metrics";

const content = contentJson as unknown as Content;
const org = orgJson as unknown as Org;

/** Family D: targets 2, 2, 2, 1 and baselines 1, 1, 1, 0 for the four AI competencies; the general competencies stay unrated here. */
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
    expect(result.belowTodayPeople).toBe(1);
    expect(result.readyToday).toBe(2);
  });
  it("computes the share of the 2030 profiles that is reached", () => {
    // a: 7 of 7 levels, b: 3 of 7, c: 5 of 7.
    expect(result.progress).toBeCloseTo(15 / 21);
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
  it("counts the people below each horizon and hides small groups", () => {
    const { employees, assessments } = build([person("a", [0, 2, 2, 1]), person("b", [1, 2, 2, 1]), person("c", [2, 2, 2, 1])]);
    const safe = competencyStats(content, employees, assessments).find((s) => s.competency.id === "safe-use")!;
    expect(safe).toMatchObject({ rated: 3, belowToday: 1, belowTarget: 2, missingLevels: 3, hidden: true });
    const lead = competencyStats(content, employees, assessments).find((s) => s.competency.id === "steer-use")!;
    expect(lead.rated).toBe(0);
  });
});

describe("kpiHistory", () => {
  it("ends at today's figures and never loses a completed conversation", () => {
    const history = kpiHistory(content, org.employees, org.assessments);
    const now = kpis(content, org.employees, org.assessments);
    expect(history).toHaveLength(8);
    expect(history[7].completed).toBe(now.completed);
    expect(history[7].readyToday).toBe(now.readyToday);
    for (let i = 1; i < history.length; i++) expect(history[i].completed).toBeGreaterThanOrEqual(history[i - 1].completed);
    expect(history[0].completed).toBeLessThan(now.completed);
  });
  it("is empty without completed conversations", () => {
    expect(kpiHistory(content, org.employees, {})).toEqual([]);
  });
});

describe("minimum group size for HR", () => {
  it("hides a competency that only one or two managers of a team are rated in", () => {
    // Team t2 has one manager with a completed conversation; the leadership competencies rest on that one person.
    const members = org.employees.filter((e) => e.team === "t2");
    const stats = competencyStats(content, members, org.assessments);
    const lead = stats.find((s) => s.competency.id === "steer-use")!;
    expect(lead.rated).toBeGreaterThan(0);
    expect(lead.rated).toBeLessThan(MIN_GROUP);
    expect(lead.hidden).toBe(true);
    expect(stats.find((s) => s.competency.id === "safe-use")!.hidden).toBe(false);
  });
});

describe("skills by unit and roles", () => {
  it("has a row per unit and hides what rests on fewer than five people", () => {
    const grid = teamGrid(content, org, org.assessments, "target");
    expect(grid).toHaveLength(org.teams.length);
    for (const row of grid) {
      for (const cell of Object.values(row.cells)) if (cell) expect(cell.hidden).toBe(cell.assessed < MIN_GROUP);
    }
    // One or two managers per unit: the leadership competencies are never shown per unit.
    expect(grid.every((row) => row.cells["steer-use"] === null || row.cells["steer-use"].hidden)).toBe(true);
    expect(grid.some((row) => row.cells["data-work"] && !row.cells["data-work"].hidden)).toBe(true);
  });
  it("lists every role once with all its holders and no rating figure for small groups", () => {
    const rows = roleOverview(content, org, org.assessments);
    expect(rows.reduce((sum, row) => sum + row.headcount, 0)).toBe(org.employees.length);
    expect(new Set(rows.map((row) => row.family.id + row.role)).size).toBe(rows.length);
    for (const row of rows) {
      expect(row.hidden).toBe(row.assessed < MIN_GROUP);
      if (row.hidden) expect(row.progress).toBeNull();
    }
    expect(rows.some((row) => row.headcount === 1)).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import contentJson from "../data/content.json";
import orgJson from "../data/org.json";
import type { Content, Org } from "../types";
import { measureUptake, nextActions, selfCheckShared, stageOf } from "./workflow";

const content = contentJson as unknown as Content;
const org = orgJson as unknown as Org;
const person = (id: string) => org.employees.find((e) => e.id === id)!;
const stage = (id: string) => stageOf(content, person(id), org.assessments[id], org.assignments[id]);

describe("stageOf", () => {
  it("follows the demo team through the four stages", () => {
    expect(stage("e2")).toBe("open"); // no conversation
    expect(stage("e7")).toBe("talking"); // conversation running
    expect(stage("e5")).toBe("agreed"); // completed, gaps, no measure
    expect(stage("e3")).toBe("planned"); // completed with measures
  });
  it("needs no measure when there is no gap", () => {
    const employee = person("e5");
    const ratings = Object.fromEntries(
      ["safe-use", "check-results", "spot-potential", "build-scale", "data-work", "adapt-learn", "process-solve"].map((c) => [c, { self: 3, manager: 3, agreed: 3, note: "" }]),
    );
    expect(stageOf(content, employee, { status: "completed", date: "2026-11-01", ratings }, [])).toBe("planned");
  });
});

describe("nextActions", () => {
  const team = org.employees.filter((e) => e.team === org.currentTeamId);
  const actions = nextActions(content, team, org.assessments, org.assignments);
  it("lists one action per person who is not done", () => {
    expect(actions.map((a) => a.employee.id).sort()).toEqual(["e2", "e4", "e5", "e6", "e7"]);
  });
  it("puts running conversations first, then missing measures, then new conversations", () => {
    expect(actions.map((a) => a.stage)).toEqual(["talking", "agreed", "open", "open", "open"]);
    expect(actions[1]).toMatchObject({ label: "Agree measures", detail: "5 steps to the 2030 target, no measure yet" });
  });
});

describe("measureUptake", () => {
  it("counts a measure once per person", () => {
    const team = org.employees.filter((e) => e.team === org.currentTeamId);
    expect(measureUptake(team, org.assignments, "m1")).toEqual({ assigned: 1, done: 0 });
    expect(measureUptake(team, org.assignments, "m9")).toEqual({ assigned: 0, done: 0 });
  });
  it("only points to measures that exist", () => {
    const known = new Set(content.measures.map((m) => m.id));
    for (const list of Object.values(org.assignments)) expect(list.every((a) => known.has(a.measureId))).toBe(true);
  });
});

describe("selfCheckShared", () => {
  it("treats a self-check as shared unless the employee keeps it private", () => {
    const employee = person("e2");
    expect(selfCheckShared(content, employee, org.assessments["e2"])).toBe(true);
    expect(selfCheckShared(content, employee, { ...org.assessments["e2"], selfShared: false })).toBe(false);
    expect(selfCheckShared(content, person("e6"), undefined)).toBe(false);
  });
});

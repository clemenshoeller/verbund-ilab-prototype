import { describe, expect, it } from "vitest";
import contentJson from "../data/content.json";
import type { Content } from "../types";
import { gapRows } from "./gap";
import { MAX_MINUTES, answerLevels, caseLevel, casesFor, evidenceText, pathTo2030, progress, recommendMeasures, rowsForLevels, selfCheckCases, selfCheckItems, selfCheckMinutes, spread, tasksFor } from "./scoring";

const content = contentJson as unknown as Content;
const family = (id: string) => content.families.find((f) => f.id === id)!;

describe("caseLevel", () => {
  it("is the highest level reached in at least two thirds of the cases", () => {
    expect(caseLevel([2])).toBe(2);
    expect(caseLevel([3, 1])).toBe(1); // two cases: both have to show it
    expect(caseLevel([3, 3, 0])).toBe(3); // one weak answer of three does not sink it
    expect(caseLevel([3, 1, 1])).toBe(1); // one strong answer does not lift it
    expect(caseLevel([2, 2, 3, 1])).toBe(2);
    expect(caseLevel([0, 0, 1])).toBe(0);
  });
  it("waits until every case is answered", () => {
    expect(caseLevel([2, null])).toBeNull();
    expect(caseLevel([])).toBeNull();
  });
  it("names the evidence behind a level", () => {
    expect(evidenceText([2])).toBe("1 case");
    expect(evidenceText([2, 3, 2])).toBe("3 cases, consistent");
    expect(evidenceText([0, 3, 2])).toBe("3 cases, answers 3 levels apart");
    expect(spread([1, null, 3])).toBe(2);
  });
});

describe("cases in the content", () => {
  it("gives every case one answer per level, so a level cannot be guessed from the number of answers", () => {
    for (const competency of content.competencies) {
      for (const task of competency.cases ?? []) {
        expect(task.options.map((o) => o.level).sort(), task.id).toEqual([0, 1, 2, 3]);
        // The answers are not listed from weak to strong.
        expect(task.options.map((o) => o.level), task.id).not.toEqual([0, 1, 2, 3]);
      }
    }
  });
  it("has cases for every competency of every profile and stays within the time limit", () => {
    for (const f of content.families) {
      const cases = selfCheckCases(content, f);
      for (const id of Object.keys(f.profile)) expect(cases.some((c) => c.competency.id === id), `${f.id} ${id}`).toBe(true);
      // Cases and written tasks together.
      const items = selfCheckItems(content, f);
      expect(selfCheckMinutes(items), f.id).toBeLessThanOrEqual(MAX_MINUTES);
      expect(selfCheckMinutes(items), f.id).toBeGreaterThanOrEqual(20);
    }
  });
  it("asks different families about different situations", () => {
    const safe = content.competencies.find((c) => c.id === "safe-use")!;
    expect(casesFor(safe, "A").map((c) => c.id)).toEqual(["safe-1", "safe-A"]);
    expect(casesFor(safe, "D").map((c) => c.id)).toEqual(["safe-1", "safe-D"]);
  });
  it("reads the level from the chosen answer, not from its position", () => {
    const tasks = casesFor(content.competencies.find((c) => c.id === "safe-use")!, "D");
    const answers = tasks.map((task) => task.options.findIndex((o) => o.level === 2));
    expect(answerLevels(tasks, answers)).toEqual([2, 2]);
    expect(answerLevels(tasks, [answers[0], null])).toEqual([2, null]);
    expect(answerLevels(tasks, undefined)).toEqual([null, null]);
  });
});

describe("written tasks in the content", () => {
  it("mixes cases with tasks that are answered in writing, so the self-check is not only questions", () => {
    for (const f of content.families) {
      const items = selfCheckItems(content, f);
      const written = items.filter((item) => item.kind === "task");
      expect(written.length, f.id).toBeGreaterThanOrEqual(3);
      expect(items.length - written.length, f.id).toBeGreaterThan(written.length);
    }
  });
  it("puts the written task of a competency after its cases", () => {
    const kinds = selfCheckItems(content, family("D")).map((item) => `${item.competency.id}:${item.kind}`);
    expect(kinds.slice(0, 6)).toEqual(["safe-use:case", "safe-use:case", "safe-use:task", "check-results:case", "check-results:case", "check-results:task"]);
  });
  it("tells the manager what to look for at each level", () => {
    for (const competency of content.competencies) {
      for (const task of competency.tasks ?? []) {
        expect(task.lookFor, task.id).toHaveLength(content.levels.length);
        expect(task.prompts.length, task.id).toBeGreaterThanOrEqual(2);
        expect(task.minutes, task.id).toBeGreaterThan(0);
      }
    }
  });
  it("asks managers about leading, and everyone else about their own use", () => {
    const ids = (f: string) => content.competencies.flatMap((c) => (f in { [f]: 1 } && c.id in family(f).profile ? tasksFor(c, f).map((t) => t.id) : []));
    expect(ids("M")).toEqual(["task-check", "task-steer", "task-guide"]);
    expect(ids("B")).toEqual(["task-safe", "task-check", "task-spot", "task-build"]);
  });
});

describe("progress to the 2030 profile", () => {
  it("is the share of the required levels that are reached", () => {
    expect(progress([{ agreed: 1, target: 2 }, { agreed: 0, target: 2 }])).toBe(0.25);
    expect(progress([{ agreed: 3, target: 3 }])).toBe(1);
  });
  it("does not let strength in one competency hide a gap in another", () => {
    expect(progress([{ agreed: 3, target: 1 }, { agreed: 0, target: 1 }])).toBe(0.5);
  });
  it("leaves out what is not rated", () => {
    expect(progress([{ agreed: null, target: 2 }])).toBeNull();
    expect(progress([{ agreed: 2, target: 2 }, { agreed: null, target: 3 }])).toBe(1);
  });
  it("plans equal steps from the first measurement to 2030", () => {
    const path = pathTo2030(0.6);
    expect(path.map((p) => p.year)).toEqual([2026, 2027, 2028, 2029, 2030]);
    expect(path.map((p) => Math.round(p.planned * 100))).toEqual([60, 70, 80, 90, 100]);
    expect(path.map((p) => p.measured)).toEqual([0.6, null, null, null, null]);
  });
});

describe("personas", () => {
  it("exist as beginner, advanced and expert for every family, with a level for every competency of the profile", () => {
    for (const f of content.families) {
      expect(f.personas?.map((p) => p.id), f.id).toEqual(["beginner", "advanced", "expert"]);
      for (const persona of f.personas ?? []) expect(Object.keys(persona.levels).sort(), `${f.id} ${persona.id}`).toEqual(Object.keys(f.profile).sort());
    }
  });
  it("get further towards 2030 from beginner to expert", () => {
    for (const f of content.families) {
      const shares = (f.personas ?? []).map((persona) => progress(rowsForLevels(content, f, persona.levels)) as number);
      expect(shares[0], f.id).toBeLessThan(shares[1]);
      expect(shares[1], f.id).toBeLessThan(shares[2]);
    }
  });
});

describe("recommendMeasures", () => {
  const b = family("B");
  const beginner = rowsForLevels(content, b, b.personas![0].levels);
  it("ranks by the most urgent competency, then trainings and foundations first", () => {
    const list = recommendMeasures(content, b, beginner);
    // Checking AI output: three levels missing and below today's expectation. Then the starter training, then use cases.
    expect(list.slice(0, 3).map((rec) => rec.measure.id)).toEqual(["m2", "m1", "m3"]);
    expect(list[0].closes[0].competency.id).toBe("check-results");
    expect(list.every((rec, i) => i === 0 || rec.score <= list[i - 1].score)).toBe(true);
  });
  it("leaves out measures of the organisation, for other families and without a gap", () => {
    const ids = recommendMeasures(content, b, beginner).map((rec) => rec.measure.id);
    expect(ids).not.toContain("m5"); // leadership programme
    expect(ids).not.toContain("m7"); // recruiting
    const expert = family("D").personas![2];
    expect(recommendMeasures(content, family("D"), rowsForLevels(content, family("D"), expert.levels))).toEqual([]);
  });
  it("prefers a chosen focus area", () => {
    const rows = gapRows(content, b, { status: "completed", date: "2026-11-01", ratings: Object.fromEntries(Object.keys(b.profile).map((id) => [id, { self: 1, manager: 1, agreed: 1, note: "" }])) });
    expect(recommendMeasures(content, b, rows, ["data-work"])[0].measure.competencies).toContain("data-work");
  });
  it("only links to courses with a title, a provider and a web address that starts with https", () => {
    for (const measure of content.measures) {
      for (const course of measure.courses ?? []) {
        expect(course.title.length, measure.id).toBeGreaterThan(3);
        expect(course.provider.length, measure.id).toBeGreaterThan(2);
        if (course.url) expect(course.url.startsWith("https://"), course.url).toBe(true);
        else expect(course.format, measure.id).toContain("assumed");
      }
    }
  });
});

import { describe, expect, it } from "vitest";
import contentJson from "../data/content.json";
import orgJson from "../data/org.json";
import type { Content, Org } from "../types";
import { familyOf, gapRows, totalGap } from "./gap";
import { kpis } from "./metrics";
import { SAMPLE_JOB_DESCRIPTIONS, analyseJobDescription, clusterBySkill, deriveProfile, profileChanges, roleChanges, suggestFamily, tasksBehind, withRoles, withUploads } from "./jobprofile";

const content = contentJson as unknown as Content;
const family = (id: string) => content.families.find((f) => f.id === id)!;

describe("target profiles", () => {
  it("follow from the tasks of the job family: the highest level any task needs, today and in 2030", () => {
    for (const f of content.families) {
      expect(f.tasks?.length, f.id).toBeGreaterThanOrEqual(4);
      expect(deriveProfile(f.tasks ?? []), f.id).toEqual(f.profile);
    }
  });
  it("can name the tasks that set a 2030 level", () => {
    expect(tasksBehind(family("B"), "check-results").map((t) => t.id)).toEqual(["B1", "B2", "B6"]);
    expect(tasksBehind(family("B"), "steer-use")).toEqual([]);
  });
  it("never puts a 2030 level below today's", () => {
    expect(deriveProfile([{ id: "x", task: "x", today: "", future: "", change: "stable", needsToday: { a: 2 }, needs2030: { a: 1 } }])).toEqual({ a: { baseline: 2, target: 2 } });
  });
});

describe("upload of a job description", () => {
  const d = family("D");
  const sample = SAMPLE_JOB_DESCRIPTIONS.D;
  const analysis = analyseJobDescription(sample.text, sample.title, content, d);

  it("reads tasks and levels from the lines of the text", () => {
    expect(analysis.tasks.length).toBeGreaterThanOrEqual(4);
    const review = analysis.tasks.find((t) => t.future.includes("sign-off"))!;
    expect(review.needs2030["check-results"]).toBe(3); // "responsible for"
    expect(review.source).toBe(sample.title);
    expect(analysis.skipped).toBeGreaterThan(0);
  });
  it("names competencies outside the profile instead of adding them", () => {
    expect(analysis.outside).toContain("guide-change");
    expect(analysis.tasks.every((t) => Object.keys(t.needs2030).every((id) => id in d.profile))).toBe(true);
  });
  it("raises targets and never lowers them", () => {
    const changes = profileChanges(d, analysis.tasks, content.levels.length);
    expect(changes.find((c) => c.competencyId === "check-results")).toEqual({ competencyId: "check-results", from: 2, to: 3 });
    expect(changes.every((c) => c.to > c.from && c.to <= content.levels.length)).toBe(true);
    const low = [{ ...analysis.tasks[0], needs2030: { "check-results": 1 } }];
    expect(profileChanges(d, low, content.levels.length)).toEqual([]);
  });
  it("adapts the profile of that family only and leaves the content untouched", () => {
    const next = withUploads(content, { D: analysis.tasks });
    expect(next.families.find((f) => f.id === "D")!.profile["check-results"].target).toBe(3);
    expect(next.families.find((f) => f.id === "D")!.tasks).toHaveLength(d.tasks!.length + analysis.tasks.length);
    expect(next.families.find((f) => f.id === "B")).toBe(family("B"));
    expect(d.profile["check-results"].target).toBe(2);
    expect(withUploads(content, {})).toBe(content);
  });
  it("understands German job descriptions", () => {
    const german = analyseJobDescription("Verantwortlich für die Prüfung und Freigabe von KI-gestützten Berichten\nMitarbeit bei der Optimierung von Prozessen", "Controller:in", content, family("B"));
    expect(german.tasks[0].needs2030["check-results"]).toBe(3);
    expect(german.tasks[1].needs2030["process-solve"]).toBe(1);
  });
  it("finds nothing in a text without tasks", () => {
    expect(analyseJobDescription("We offer a canteen and a pleasant working atmosphere.", "x", content, d).tasks).toEqual([]);
  });
  it("has an example for every job family", () => {
    for (const f of content.families) expect(analyseJobDescription(SAMPLE_JOB_DESCRIPTIONS[f.id].text, "x", content, f).tasks.length, f.id).toBeGreaterThan(2);
  });
});

describe("clusters of a job description", () => {
  const d = family("D");
  const sample = SAMPLE_JOB_DESCRIPTIONS.D;
  const tasks = analyseJobDescription(sample.text, sample.title, content, d).tasks;

  it("groups the tasks by the competency they need, the largest group first", () => {
    const clusters = clusterBySkill(tasks);
    expect(clusters.length).toBeGreaterThanOrEqual(4);
    expect(clusters.every((c, i) => i === 0 || c.tasks.length <= clusters[i - 1].tasks.length)).toBe(true);
    const data = clusters.find((c) => c.competencyId === "data-work")!;
    expect(data.tasks.length).toBeGreaterThanOrEqual(2);
    expect(data.level).toBe(3);
    // Every task sits in every cluster it needs.
    expect(clusters.reduce((sum, c) => sum + c.tasks.length, 0)).toBe(tasks.reduce((sum, t) => sum + Object.keys(t.needs2030).length, 0));
  });
  it("names the job family a description reads like", () => {
    for (const f of content.families) {
      const example = SAMPLE_JOB_DESCRIPTIONS[f.id];
      expect(suggestFamily(example.text, example.title, content)[0].family.id, f.id).toBe(f.id);
    }
    expect(suggestFamily("Wir bieten eine Kantine.", "", content)).toEqual([]);
  });
});

describe("role profiles", () => {
  const org = orgJson as unknown as Org;
  const roles = content.roleProfiles ?? [];
  const person = (id: string) => org.employees.find((e) => e.id === id)!;
  const model = withRoles(content, org.employees, org.roles ?? {}, roles);

  it("come with the content, each for one job family and with tasks that only name competencies of that family", () => {
    expect(roles.length).toBeGreaterThanOrEqual(3);
    for (const role of roles) {
      const f = family(role.family);
      expect(f, role.id).toBeDefined();
      for (const task of role.tasks) expect(Object.keys(task.needs2030).every((id) => id in f.profile), task.id).toBe(true);
    }
  });
  it("are assigned to three people of the demo team, each within the person's job family", () => {
    expect(Object.keys(org.roles ?? {}).sort()).toEqual(["e1", "e3", "e5"]);
    for (const [employeeId, roleId] of Object.entries(org.roles ?? {})) {
      expect(roles.find((r) => r.id === roleId)?.family, employeeId).toBe(person(employeeId).family);
    }
  });
  it("raise targets for the people who hold the role, and for nobody else", () => {
    const controller = roles.find((r) => r.id === "role-controller")!;
    expect(roleChanges(content, controller)).toEqual([
      { competencyId: "build-scale", from: 1, to: 2 },
      { competencyId: "data-work", from: 2, to: 3 },
    ]);
    const julia = familyOf(model, person("e3"))!;
    expect(julia.role).toEqual({ id: "role-controller", name: "Controller, group controlling" });
    expect(julia.profile["data-work"]).toEqual({ baseline: 1, target: 3 });
    expect(julia.tasks?.filter((t) => t.role).map((t) => t.id)).toEqual(["R-CO1", "R-CO2"]);
    // Thomas is in the same job family without the role: the family profile, untouched.
    expect(familyOf(model, person("e4"))).toBe(family("B"));
    expect(family("B").profile["data-work"].target).toBe(2);
    expect(totalGap(gapRows(model, julia, org.assessments["e3"]))).toBe(8);
    expect(totalGap(gapRows(content, family("B"), org.assessments["e3"]))).toBe(6);
  });
  it("leave the targets alone where the job family already asks for as much", () => {
    const anna = familyOf(model, person("e1"))!;
    expect(roleChanges(content, roles.find((r) => r.id === "role-data-engineer")!)).toEqual([]);
    expect(anna.profile).toEqual(family("A").profile);
    expect(anna.tasks!.length).toBe(family("A").tasks!.length + 2);
  });
  it("ignore a role profile of another job family and an unknown one", () => {
    const wrong = withRoles(content, org.employees, { e3: "role-maintenance", e4: "nothing" }, roles);
    expect(wrong).toBe(content);
  });
  it("count in the totals for HR with the person's own targets", () => {
    const withRole = kpis(model, org.employees, org.assessments);
    const without = kpis(content, org.employees, org.assessments);
    // Higher targets for three people: the same people meet today's expectations, a smaller share of the 2030 profiles is reached.
    expect(withRole.readyToday).toBe(without.readyToday);
    expect(withRole.progress as number).toBeLessThan(without.progress as number);
  });
});

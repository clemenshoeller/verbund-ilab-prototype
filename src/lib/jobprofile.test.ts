import { describe, expect, it } from "vitest";
import contentJson from "../data/content.json";
import type { Content } from "../types";
import { SAMPLE_JOB_DESCRIPTIONS, analyseJobDescription, deriveProfile, profileChanges, tasksBehind, withUploads } from "./jobprofile";

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
    expect(tasksBehind(family("B"), "check-results").map((t) => t.id)).toEqual(["B1", "B2"]);
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

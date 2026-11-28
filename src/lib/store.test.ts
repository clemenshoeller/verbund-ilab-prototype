import { describe, expect, it } from "vitest";
import { readSaved } from "./store";

const good = { seed: "p1", assessments: { e1: { status: "completed", date: "2026-11-01", ratings: {} } }, assignments: { e1: [{ measureId: "m1", status: "planned", date: "2026-11-01" }] } };

describe("readSaved", () => {
  it("accepts a saved state of the expected shape for the same sample data", () => {
    expect(readSaved(JSON.stringify(good), "p1")).toEqual({ assessments: good.assessments, assignments: good.assignments, uploads: {} });
  });
  it("keeps the tasks of uploaded job descriptions", () => {
    const uploads = { D: [{ id: "D-upload-1", task: "Review diagnoses", today: "", future: "Review diagnoses", change: "augmented", needsToday: {}, needs2030: { "check-results": 3 } }] };
    expect(readSaved(JSON.stringify({ ...good, uploads }), "p1")?.uploads).toEqual(uploads);
    expect(readSaved(JSON.stringify({ ...good, uploads: { D: [{ task: 1 }] } }), "p1")).toBeNull();
  });
  it("drops edits that belong to other sample data", () => {
    expect(readSaved(JSON.stringify(good), "p2")).toBeNull();
  });
  it("rejects anything that would crash the app", () => {
    const bad = ["", "not json", "null", "{}", "[]", JSON.stringify({ seed: "p1" }), JSON.stringify({ seed: "p1", assessments: {} }), JSON.stringify({ seed: "p1", assessments: { e1: { status: "completed" } }, assignments: {} }), JSON.stringify({ seed: "p1", assessments: {}, assignments: { e1: "x" } })];
    for (const raw of bad) expect(readSaved(raw, "p1"), raw).toBeNull();
    expect(readSaved(null, "p1")).toBeNull();
  });
});

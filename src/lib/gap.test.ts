import { describe, expect, it } from "vitest";
import contentJson from "../data/content.json";
import orgJson from "../data/org.json";
import type { Content, Org } from "../types";
import { activeFocus, agreedCount, gapRows, gapTo, profileCompetencies, standing, standingText, summarise, totalGap } from "./gap";

const content = contentJson as unknown as Content;
const org = orgJson as unknown as Org;
const family = (id: string) => content.families.find((f) => f.id === id)!;

describe("gapTo", () => {
  it("returns the missing levels", () => {
    expect(gapTo(3, 1)).toBe(2);
  });
  it("is never negative when someone is above target", () => {
    expect(gapTo(1, 3)).toBe(0);
  });
  it("is null while no level is agreed", () => {
    expect(gapTo(3, null)).toBeNull();
    expect(gapTo(3, undefined)).toBeNull();
  });
  it("treats level 0 as a rating, not as missing", () => {
    expect(gapTo(1, 0)).toBe(1);
  });
});

describe("profiles", () => {
  it("gives leadership competencies only to managers", () => {
    const ids = (id: string) => profileCompetencies(content, family(id)).map((c) => c.id);
    expect(ids("M")).toContain("steer-use");
    expect(ids("A")).not.toContain("steer-use");
    expect(ids("B")).toHaveLength(4);
  });
  it("only references competencies that exist, with targets at or above baseline", () => {
    const known = new Set(content.competencies.map((c) => c.id));
    for (const f of content.families) {
      for (const [id, entry] of Object.entries(f.profile)) {
        expect(known.has(id)).toBe(true);
        expect(entry.target).toBeGreaterThanOrEqual(entry.baseline);
        expect(entry.target).toBeLessThanOrEqual(content.levels.length);
      }
    }
  });
});

describe("gapRows", () => {
  it("computes the gaps of a completed sample assessment", () => {
    const rows = gapRows(content, family("B"), org.assessments["e3"]);
    expect(rows.map((r) => r.gap)).toEqual([0, 2, 1, 1]);
    expect(totalGap(rows)).toBe(4);
    expect(agreedCount(rows)).toBe(4);
  });
  it("leaves gaps open without an assessment", () => {
    const rows = gapRows(content, family("D"), undefined);
    expect(rows.every((r) => r.gap === null)).toBe(true);
    expect(totalGap(rows)).toBeNull();
  });
});

describe("sample data", () => {
  it("only uses employees with a known family", () => {
    const known = new Set(content.families.map((f) => f.id));
    expect(org.employees.every((e) => known.has(e.family))).toBe(true);
  });
  it("puts every employee into an existing team", () => {
    const teams = new Set(org.teams.map((t) => t.id));
    expect(org.employees.every((e) => teams.has(e.team))).toBe(true);
    expect(teams.has(org.currentTeamId)).toBe(true);
  });
});

describe("standing in words", () => {
  const rows = gapRows(content, family("B"), org.assessments["e3"]); // agreed 2, 1, 1, 0 against targets 2, 3, 2, 1
  it("names each state", () => {
    expect(rows.map(standing)).toEqual(["reached", "steps", "steps", "steps"]);
    expect(standingText(rows[1])).toBe("2 steps to the 2030 target");
    expect(standingText(rows[2])).toBe("1 step to the 2030 target");
  });
  it("flags a level below today's expectation", () => {
    const below = { ...rows[0], agreed: 0, gap: 2 };
    expect(standing(below)).toBe("below");
    expect(standingText(below)).toBe("Below today\u2019s expectation");
  });
  it("summarises a person in two sentences", () => {
    expect(summarise("Julia", rows)).toBe(
      "Julia meets today\u2019s expectations in all 4 competencies. For 2030, 4 steps are still to go in 3 of 4 competencies, most in \u201cChecking and owning AI results\u201d.",
    );
    expect(summarise("Katharina", gapRows(content, family("D"), undefined))).toBe("Katharina has no agreed levels yet.");
  });
});

describe("activeFocus", () => {
  const rows = gapRows(content, family("B"), org.assessments["e3"]); // gaps 0, 2, 1, 1
  it("keeps a focus only while its gap is open", () => {
    expect(activeFocus(rows, ["safe-use", "check-results"])).toEqual(["check-results"]);
    expect(activeFocus(rows, undefined)).toEqual([]);
    expect(activeFocus(rows, ["unknown"])).toEqual([]);
  });
});

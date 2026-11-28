// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import contentJson from "./data/content.json";
import { selfCheckItems } from "./lib/scoring";
import type { Content } from "./types";

const content = contentJson as unknown as Content;

/** Click tests of the whole app: every page opens, the role menu, the preview, and the main journey. */

async function open(hash: string) {
  await act(async () => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
}

async function start(hash = "/team") {
  window.location.hash = hash;
  render(<App />);
  await screen.findByRole("navigation", { name: "Main" });
}

const main = () => document.querySelector("main") as HTMLElement;
const click = (element: Element) => fireEvent.click(element);

beforeEach(() => {
  localStorage.clear();
  window.scrollTo = () => {};
});
afterEach(() => {
  cleanup();
  window.location.hash = "";
});

describe("pages", () => {
  const pages = [
    "/", "/guide", "/about",
    "/me", "/me/check", "/me/check/1", "/me/check/3", "/me/check/13", "/me/check/99", "/me/check/result", "/me/data",
    "/team", "/team/pipeline", "/team/people", "/team/people?stage=agreed", "/team/profiles/D",
    "/team/people/e3", "/team/people/e3/conversation", "/team/people/e3/conversation/check-results",
    "/team/people/e3/conversation/focus", "/team/people/e3/conversation/summary", "/team/people/e3/activity",
    "/team/people/unknown",
    "/hr", "/hr/gaps", "/hr/gaps/baseline", "/hr/tasks", "/hr/tasks/D", "/hr/personas", "/hr/personas/M",
    "/hr/teams", "/hr/teams/t8", "/hr/teams/unknown", "/hr/skills", "/hr/skills/target", "/hr/roles", "/hr/roles/A",
    "/hr/upload", "/hr/upload/D",
    "/hr/profiles/M", "/hr/competencies", "/hr/competencies/safe-use", "/hr/competencies/unknown",
    "/hr/measures", "/hr/measures/recruiting", "/hr/roadmap", "/hr/governance",
  ];

  it("opens every page with a heading and content", async () => {
    await start();
    for (const page of pages) {
      await open(page);
      expect(main().querySelector("h1"), page).not.toBeNull();
      expect(main().textContent!.length, page).toBeGreaterThan(40);
    }
  });

  it("follows every link of the navigation in each role", async () => {
    await start();
    for (const role of ["me", "team", "hr"]) {
      await open(`/${role}`);
      const links = [...document.querySelectorAll<HTMLAnchorElement>(".side nav a, .side-foot a")].map((a) => a.getAttribute("href")!);
      expect(links.length).toBeGreaterThan(3);
      for (const href of links) {
        await open(href.slice(1));
        expect(main().querySelector("h1"), href).not.toBeNull();
      }
    }
  });

  it("applies a stage filter from the address", async () => {
    await start("/team/people?stage=agreed");
    expect(within(main()).getByText("1 of 7")).toBeTruthy();
    expect(within(main()).getByText("Stefan Huber")).toBeTruthy();
  });
});

describe("start page", () => {
  it("is where the app opens and where the logo leads back to", async () => {
    await start("/");
    expect(main().querySelector("h1")!.textContent).toContain("One conversation per person a year");
    await open("/hr/teams");
    const logo = screen.getByRole("link", { name: "AI Competency Check, start page" });
    expect(logo.getAttribute("href")).toBe("#/");
    click(logo);
    await open("/");
    expect(main().querySelector("h1")!.textContent).toContain("One conversation per person a year");
    // The navigation of the role last used stays in place.
    expect(screen.getByRole("button", { name: /View as HR/ })).toBeTruthy();
  });
});

describe("view as", () => {
  it("switches the role from the list at the top right", async () => {
    await start();
    const button = screen.getByRole("button", { name: /View as Manager/ });
    click(button);
    const list = screen.getByRole("navigation", { name: "View as" });
    expect(within(list).getAllByRole("link")).toHaveLength(5);
    expect(within(list).getByRole("link", { name: /Manager/ }).getAttribute("aria-current")).toBe("true");
    click(within(list).getByRole("link", { name: /HR/ }));
    await open("/hr");
    expect(screen.queryByRole("navigation", { name: "View as" })).toBeNull();
    expect(screen.getByRole("button", { name: /View as HR/ })).toBeTruthy();
    expect(main().querySelector("h1")!.textContent).toContain("assessed employees meet today");
  });

  it("closes with Escape and when the current role is chosen again", async () => {
    await start();
    const button = screen.getByRole("button", { name: /View as/ });
    click(button);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("navigation", { name: "View as" })).toBeNull();
    expect(document.activeElement).toBe(button);
    click(button);
    click(within(screen.getByRole("navigation", { name: "View as" })).getByRole("link", { name: /Manager/ }));
    expect(screen.queryByRole("navigation", { name: "View as" })).toBeNull();
  });

  it("resets the demo data with a confirmation", async () => {
    await start();
    click(screen.getByRole("button", { name: /View as/ }));
    click(screen.getByRole("button", { name: /Reset demo data/ }));
    expect(screen.getByRole("status").textContent).toContain("Demo data reset");
  });
});

describe("search", () => {
  it("is operated with the arrow keys and Enter", async () => {
    await start("/hr");
    const box = screen.getByRole("combobox", { name: "Search" });
    fireEvent.focus(box);
    fireEvent.change(box, { target: { value: "a" } });
    const options = screen.getAllByRole("option");
    expect(options.length).toBeGreaterThan(1);
    expect(options[0].getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(box, { key: "ArrowDown" });
    expect(screen.getAllByRole("option")[1].getAttribute("aria-selected")).toBe("true");
    const wanted = screen.getAllByRole("option")[1].querySelector("strong")!.textContent!;
    fireEvent.keyDown(box, { key: "Enter" });
    await open(window.location.hash.slice(1));
    expect(window.location.hash.startsWith("#/hr/")).toBe(true);
    expect(document.body.textContent).toContain(wanted);
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("finds no persons for HR", async () => {
    await start("/hr");
    const box = screen.getByRole("combobox", { name: "Search" });
    fireEvent.focus(box);
    fireEvent.change(box, { target: { value: "Berger" } });
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByRole("listbox").textContent).toContain("Nothing found");
  });
});

describe("preview", () => {
  it("opens a person from the list and closes with Escape", async () => {
    await start("/team/people");
    click(within(main()).getByText("Julia Steiner"));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Julia Steiner" })).toBeTruthy();
    expect(within(dialog).getByRole("link", { name: "Open the full record" }).getAttribute("href")).toBe("#/team/people/e3");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("gives the focus back without moving the page when it closes", async () => {
    await start("/team/people");
    const calls: (FocusOptions | undefined)[] = [];
    const focus = HTMLElement.prototype.focus;
    HTMLElement.prototype.focus = function (options?: FocusOptions) {
      calls.push(options);
      focus.call(this, options);
    };
    try {
      click(within(main()).getByText("Julia Steiner"));
      fireEvent.keyDown(window, { key: "Escape" });
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(calls.length).toBeGreaterThan(1);
      expect(calls.every((options) => options?.preventScroll)).toBe(true);
    } finally {
      HTMLElement.prototype.focus = focus;
    }
  });

  it("offers the next step for a person on the board", async () => {
    await start("/team/pipeline");
    click(within(main()).getByText("Stefan Huber"));
    expect(within(screen.getByRole("dialog")).getByRole("link", { name: "Agree measures" }).getAttribute("href")).toBe("#/team/people/e5/conversation/focus");
  });

  it("opens a heatmap cell for HR and never a person", async () => {
    await start("/hr/gaps");
    const cell = main().querySelector<HTMLButtonElement>(".cell.openable button")!;
    click(cell);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/rated employees meet today’s expectation, \d+ already reach the 2030 target/)).toBeTruthy();
    expect(dialog.textContent).not.toMatch(/Anna Berger|Julia Steiner|Stefan Huber/);
    click(screen.getByRole("button", { name: "Close preview" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("the journey of one person", () => {
  it("goes from the self-check through the conversation to the totals for HR", async () => {
    await start("/hr");
    const before = main().querySelector("h1")!.textContent!;
    expect(before).toContain("20 of 63");

    // Employee: self-check with cases to choose from and tasks to write up, one per screen.
    const items = selfCheckItems(content, content.families.find((f) => f.id === "D")!);
    expect(items.map((item) => item.kind).join(" ")).toBe("case case task case case task case task case task case case case");
    const shown: Record<string, number[]> = {
      "safe-use": [1, 1],
      "check-results": [3, 1], // two cases: both have to show a level
      "spot-potential": [1],
      "build-scale": [0],
      "data-work": [1],
      "adapt-learn": [1],
      "process-solve": [2],
    };
    const wrote = "The tool suggested a bearing. I compared it with the vibration data and the last inspection and found a loose mounting instead.";
    await open("/me/check");
    expect(main().textContent).toContain("9 cases and 4 written tasks from your work in 7 competencies. About 36 minutes");
    await open("/me/check/1");
    for (const item of items) {
      const next = within(main()).getByRole("button", { name: /^Next$|See my result/ }) as HTMLButtonElement;
      expect(next.disabled).toBe(true);
      // The level an answer shows, or a text is worth, is never visible to the employee.
      expect(main().textContent).not.toMatch(/Foundation|Practitioner|Advanced/);
      if (item.kind === "case") {
        const radios = within(main()).getAllByRole("radio");
        expect(radios).toHaveLength(4);
        click(radios[item.task.options.findIndex((o) => o.level === shown[item.competency.id][item.index])]);
      } else if (item.competency.id === "build-scale") {
        // Nothing to tell yet: the task can be left without an example.
        click(within(main()).getByRole("button", { name: "I have no example yet" }));
        await open(window.location.hash.slice(1));
        continue;
      } else {
        expect(within(main()).queryAllByRole("radio")).toHaveLength(0);
        const box = within(main()).getByRole("textbox", { name: "Your answer" });
        // One character is enough to go on; an empty or blank answer is not.
        fireEvent.change(box, { target: { value: "  " } });
        expect(next.disabled).toBe(true);
        fireEvent.change(box, { target: { value: "x" } });
        expect(next.disabled).toBe(false);
        fireEvent.change(box, { target: { value: wrote } });
      }
      expect(next.disabled).toBe(false);
      click(next);
      await open(window.location.hash.slice(1));
    }
    // The result is the employee's own: levels from the cases, how far to 2030, and ideas with links to courses.
    expect(main().querySelector("h1")!.textContent).toBe("Your self-check result");
    expect(main().textContent).toContain("You have reached 50% of your 2030 profile.");
    expect(main().textContent).toContain("You wrote 3 of 4 tasks; they are not rated here.");
    expect(main().textContent).toContain("Foundation · 2 cases, answers 2 levels apart · written task: written");
    expect(main().textContent).toContain("Not yet · 1 case · written task: no example yet");
    const course = within(main()).getByRole("link", { name: /Elements of AI/ });
    expect(course.getAttribute("href")).toBe("https://www.elementsofai.com/");
    expect(course.getAttribute("target")).toBe("_blank");

    // Until it is shared, the manager does not see it.
    await open("/team/people/e6/conversation");
    expect(main().textContent).toContain("Katharina has done the self-check and keeps the result private.");
    await open("/team/people/e6/conversation/check-results");
    expect(main().querySelectorAll(".pickcell.self")).toHaveLength(0);
    expect(main().textContent).not.toContain("From the self-check");
    expect(main().querySelector(".sample")).toBeNull();
    expect(main().textContent).not.toContain("loose mounting");

    await open("/me/check/result");
    click(within(main()).getByRole("button", { name: "Share with Elisabeth Brunner" }));
    expect(screen.getByRole("status").textContent).toContain("Self-check shared with Elisabeth Brunner");
    await open("/me");
    expect(main().textContent).toContain("Your self-check is with Elisabeth Brunner.");

    // Manager: sees the self-check with the evidence behind it, agrees every level.
    await open("/team/people/e6/conversation");
    expect(main().textContent).toContain("Katharina has done the self-check and shared it.");
    await open("/team/people/e6/conversation/check-results");
    expect(main().textContent).toContain("From the self-check: Foundation (2 cases, answers 2 levels apart). The answers were far apart");
    // The written task is the work sample the manager reads and rates, with what to look for per level.
    const sample = main().querySelector(".sample")!;
    expect(sample.querySelector(".sample-text")!.textContent).toBe(wrote);
    expect(sample.textContent).toContain("An AI result you used.");
    expect([...sample.querySelectorAll(".level-list li")]).toHaveLength(3);
    await open("/team/people/e6/conversation/build-scale");
    expect(main().querySelector(".sample")!.textContent).toContain("Katharina gave no example for this task.");
    await open("/team/people/e6/conversation/data-work");
    expect(main().querySelector(".sample")).toBeNull();
    const levels = { "safe-use": 1, "check-results": 1, "spot-potential": 1, "build-scale": 0, "data-work": 1, "adapt-learn": 1, "process-solve": 2 };
    for (const [id, level] of Object.entries(levels)) {
      await open(`/team/people/e6/conversation/${id}`);
      const radios = (column: string) => [...main().querySelectorAll<HTMLInputElement>(`.pickcell.${column} input`)];
      click(radios("manager")[level]);
      click(radios("agreed")[level]);
      expect(radios("agreed")[level].checked).toBe(true);
    }

    // Focus: two at most, then a measure.
    await open("/team/people/e6/conversation/focus");
    const options = () => [...main().querySelectorAll<HTMLButtonElement>(".options .option")];
    click(options()[0]);
    click(options()[1]);
    expect(options()[2].disabled).toBe(true);
    click(within(main()).getAllByRole("button", { name: "Add" })[0]);
    expect(screen.getByRole("status").textContent).toContain("Measure agreed with Katharina");

    // Summary and completion.
    await open("/team/people/e6/conversation/summary");
    click(within(main()).getByRole("button", { name: "Complete the conversation" }));
    await open(window.location.hash.slice(1));
    expect(window.location.hash).toBe("#/team/people/e6");
    expect(main().textContent).toContain("Katharina meets today’s expectations in all 7 competencies.");

    // The employee sees the agreed levels, HR sees one more person.
    await open("/me");
    expect(main().textContent).toContain("Your levels are agreed with Elisabeth Brunner.");
    await open("/hr");
    expect(main().querySelector("h1")!.textContent).toContain("21 of 64");
  });

  it("keeps the changes after a reload and forgets them after a reset", async () => {
    await start("/me/check/1");
    click(within(main()).getAllByRole("radio")[2]);
    cleanup();
    await start("/me/check/1");
    expect((within(main()).getAllByRole("radio")[2] as HTMLInputElement).checked).toBe(true);
    click(screen.getByRole("button", { name: /View as/ }));
    click(screen.getByRole("button", { name: /Reset demo data/ }));
    expect((within(main()).getAllByRole("radio")[2] as HTMLInputElement).checked).toBe(false);
  });
});

describe("differences in view", () => {
  it("lists where the self-check and the manager were apart and leads to that step", async () => {
    await start("/team/people/e3");
    const card = [...main().querySelectorAll(".card")].find((c) => c.querySelector("h2")?.textContent === "Seen differently")!;
    expect(card.querySelector(".card-aside")!.textContent).toBe("1 of 7");
    const link = card.querySelector<HTMLAnchorElement>("a.row")!;
    expect(link.querySelector(".views")!.getAttribute("aria-label")).toBe("Julia: Practitioner, you: Foundation, agreed: Foundation");
    expect(link.textContent).toContain("Julia rates one step higher · agreed: Foundation");
    expect(link.getAttribute("href")).toBe("#/team/people/e3/conversation/check-results");
  });

  it("shows on the team dashboard who has reached the 2030 target per competency", async () => {
    await start("/team");
    const cells = [...main().querySelectorAll(".matrix tfoot td")].map((td) => td.textContent);
    expect(cells).toEqual(["Julia, Michael", "Anna, Stefan", "Nobody yet", "Annaonly one", "–", "–", "Anna, Julia", "Nobody yet", "Stefanonly one"]);
  });

  it("leaves the card out while the manager has rated nothing", async () => {
    await start("/team/people/e6");
    expect(main().textContent).not.toContain("Seen differently");
  });
});

describe("findings of the code review", () => {
  it("never shows HR a figure that rests on one or two managers of a team", async () => {
    await start("/hr/teams/t2");
    expect(main().textContent).not.toMatch(/Steering AI use\s*\d+ of \d+/);
    expect(main().textContent).toContain("Not shown, fewer than 5 rated: Steering AI use, Guiding the AI change.");
    await open("/hr/teams");
    click(within(main()).getByRole("button", { name: "Data & Analytics" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain("Not shown, fewer than 5 rated");
    expect(dialog.textContent).not.toMatch(/Guiding the AI change\s*\d+ of \d+/);
  });

  it("survives broken saved data", async () => {
    for (const broken of ["{}", "null", "not json", JSON.stringify({ assessments: { e1: {} } })]) {
      localStorage.setItem("ai-competency-check.state.v5", broken);
      await start("/team");
      expect(main().querySelector("h1")!.textContent).toBe("3 of 7 conversations are done.");
      expect(localStorage.getItem("ai-competency-check.state.v5")).toBeNull();
      cleanup();
    }
  });

  it("keeps a completed conversation completed when a note is edited", async () => {
    await start("/team/people/e3/conversation/check-results");
    click(within(main()).getByText("Add a note"));
    const note = within(main()).getByRole("textbox", { name: "Note" });
    fireEvent.change(note, { target: { value: "x" } });
    fireEvent.change(note, { target: { value: "" } });
    expect(within(main()).getByRole("textbox", { name: "Note" })).toBeTruthy();
    await open("/team/people/e3");
    expect(main().textContent).toContain("Agreed on 05.11.2026");
    await open("/team");
    expect(main().querySelector("h1")!.textContent).toBe("3 of 7 conversations are done.");
  });

  it("frees a focus area when its gap is closed afterwards", async () => {
    await start("/team/people/e3/conversation/focus");
    const options = () => [...main().querySelectorAll<HTMLButtonElement>(".options .option")];
    expect(options().filter((o) => o.getAttribute("aria-pressed") === "true")).toHaveLength(2);
    expect(options()[2].disabled).toBe(true);
    // Raise "Checking and owning AI results" to its target: it is no gap any more and no focus either.
    await open("/team/people/e3/conversation/check-results");
    click([...main().querySelectorAll<HTMLInputElement>(".pickcell.agreed input")][3]);
    await open("/team/people/e3/conversation/focus");
    expect(options().map((o) => o.textContent)).not.toContain(expect.stringContaining("Checking and owning"));
    expect(options().filter((o) => o.getAttribute("aria-pressed") === "true")).toHaveLength(1);
    expect(options().every((o) => !o.disabled)).toBe(true);
  });

  it("ignores an unknown stage in the address and clears the filter from the navigation", async () => {
    await start("/team/people?stage=nonsense");
    expect(within(main()).getByText("7 of 7")).toBeTruthy();
    await open("/team/people?stage=agreed");
    expect(within(main()).getByText("1 of 7")).toBeTruthy();
    await open("/team/people");
    expect(within(main()).getByText("7 of 7")).toBeTruthy();
  });

  it("moves the focus to the heading of the new page", async () => {
    await start("/team");
    await open("/team/pipeline");
    expect(document.activeElement).toBe(main().querySelector("h1"));
  });

  it("makes the page behind an open preview unreachable", async () => {
    await start("/team/people");
    click(within(main()).getByRole("button", { name: "Julia Steiner" }));
    expect(document.querySelector<HTMLElement>(".app > .main")!.inert).toBe(true);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(document.querySelector<HTMLElement>(".app > .main")!.inert).toBe(false);
  });
});

describe("menu", () => {
  const menu = () => within(screen.getByRole("navigation", { name: "Main" }));
  const labels = () => menu().getAllByRole("link").map((link) => link.textContent?.replace(/\d+$/, "").trim());

  it("shows the manager three items and one team page as list or board", async () => {
    await start("/team/people");
    expect(labels()).toEqual(["Dashboard", "Team", "Target profiles"]);
    const toggle = within(screen.getByRole("navigation", { name: "Show the team as" }));
    expect(toggle.getByRole("link", { name: "List" }).getAttribute("aria-current")).toBe("page");
    await open("/team/pipeline");
    expect(menu().getByRole("link", { name: /Team/ }).getAttribute("aria-current")).toBe("page");
    expect(within(screen.getByRole("navigation", { name: "Show the team as" })).getByRole("link", { name: "Board" }).getAttribute("aria-current")).toBe("page");
  });

  it("shows HR five items and the merged pages as tabs", async () => {
    await start("/hr/competencies");
    expect(labels()).toEqual(["Dashboard", "Gap analysis", "Teams", "Competency model", "Plan"]);
    expect(menu().getByRole("link", { name: "Competency model" }).getAttribute("aria-current")).toBe("page");
    const tabs = within(screen.getByRole("tablist", { name: "Competency model" }));
    expect(tabs.getAllByRole("tab").map((t) => t.textContent?.replace(/\d+$/, ""))).toEqual(["Job families", "Competencies", "Measures", "Upload"]);
    expect(tabs.getByRole("tab", { name: /Competencies/ }).getAttribute("aria-selected")).toBe("true");
    await open("/hr/governance");
    expect(menu().getByRole("link", { name: "Plan" }).getAttribute("aria-current")).toBe("page");
    expect(within(screen.getByRole("tablist", { name: "Plan" })).getByRole("tab", { name: "Governance" }).getAttribute("aria-selected")).toBe("true");
    // A single record keeps its own path back instead of the tabs.
    await open("/hr/competencies/safe-use");
    expect(screen.queryByRole("tablist", { name: "Competency model" })).toBeNull();
  });
});

describe("VERBUND's competency model", () => {
  it("shows the definition and the behaviour anchors of a competency for HR", async () => {
    await start("/hr/competencies/safe-use");
    expect(main().textContent).toContain("VERBUND: AI sicher einsetzen");
    const anchors = [...main().querySelectorAll(".anchor h3")].map((h) => h.textContent);
    expect(anchors).toEqual(["Too little", "Good", "Too much"]);
  });

  it("marks the general competencies as a draft of the team and shows the cases behind a competency", async () => {
    await start("/hr/competencies");
    expect(main().textContent).toContain("6 AI competencies from VERBUND’s competency model");
    expect(main().textContent).toContain("3 general competencies");
    // The framework of the team: three layers, and the further skills with the interviews that name them.
    expect(main().textContent).toContain("The framework in three layers");
    const further = [...main().querySelectorAll(".card")].find((c) => c.querySelector("h2")?.textContent === "Further skills from the interviews")!;
    expect(further.querySelectorAll("tbody tr")).toHaveLength(7);
    expect(further.textContent).toContain("Critical thinking and independent judgment");
    expect(further.textContent).toContain("7 interviewsI1, I7, I10, I13, I18, I20, I22");
    expect(further.textContent).toContain("Not assessed");
    expect(further.textContent).toContain("VERBUND’s own general competencies were not available to the team");
    await open("/hr/competencies/adapt-learn");
    expect(main().textContent).toContain("according to 6 of our interviews (I2, I7, I13, I20, I21, I22)");
    await open("/hr/competencies/safe-use");
    expect(main().textContent).toContain("Includes, in the team’s framework:");
    await open("/hr/competencies/check-results");
    const card = [...main().querySelectorAll(".card")].find((c) => c.querySelector("h2")?.textContent === "Cases and tasks in the self-check")!;
    expect(card.querySelectorAll("details")).toHaveLength(6);
    expect(card.textContent).toContain("For Engineering & Technicians");
    expect(card.textContent).toContain("Written task · for every job family");
    expect(card.textContent).toContain("What the manager looks for");
  });
});

describe("after the jour fixe of 24.11.2026", () => {
  const names = /Anna Berger|Julia Steiner|Stefan Huber|Katharina Moser|Markus Leitner/;

  it("fills the self-check as a persona and shows the result without sharing it", async () => {
    await start("/me/check");
    click(within(main()).getByRole("button", { name: "Answer as beginner" }));
    await open(window.location.hash.slice(1));
    expect(window.location.hash).toBe("#/me/check/result");
    expect(main().textContent).toContain("You have reached 21% of your 2030 profile.");
    expect(within(main()).getByRole("button", { name: "Share with Elisabeth Brunner" })).toBeTruthy();
    await open("/me");
    expect(main().textContent).toContain("The result is yours. Share it when you are ready.");
    await open("/team/pipeline");
    const card = [...main().querySelectorAll(".kcard")].find((c) => c.textContent!.includes("Katharina Moser"))!;
    expect(card.querySelector(".kcard-foot")!.textContent).toBe("Self-check not shared yet");
  });

  it("shows the manager the written work sample of a shared self-check", async () => {
    await start("/team/people/e2/conversation/check-results");
    const sample = main().querySelector(".sample")!;
    expect(sample.textContent).toContain("Work sample from Markus’s self-check · read it and rate it in your column");
    expect(sample.querySelector(".sample-text")!.textContent).toContain("migration script");
    // Reading it is the manager's job: nothing is rated before the manager chooses a level.
    expect([...main().querySelectorAll<HTMLInputElement>(".pickcell.manager input")].some((input) => input.checked)).toBe(false);
  });

  it("keeps the place on the page when a tab inside it is switched", async () => {
    await start("/hr/gaps");
    const calls: number[][] = [];
    window.scrollTo = ((x: number, y: number) => {
      calls.push([x, y]);
    }) as unknown as typeof window.scrollTo;
    Object.defineProperty(window, "scrollY", { value: 420, configurable: true });
    try {
      const tab = within(main()).getByRole("tab", { name: "Expected today" });
      tab.focus();
      click(tab);
      await open(window.location.hash.slice(1));
      expect(window.location.hash).toBe("#/hr/gaps/baseline");
      expect(calls).toEqual([[0, 420]]);
      const now = within(main()).getByRole("tab", { name: "Expected today" });
      expect(now.getAttribute("aria-selected")).toBe("true");
      expect(document.activeElement).toBe(now);
      // Moving to another page still starts at the top, with the heading in focus.
      await open("/hr/teams");
      expect(calls[calls.length - 1]).toEqual([0, 0]);
      expect(document.activeElement).toBe(main().querySelector("h1"));
    } finally {
      Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
    }
  });

  it("shows the employee how the own job changes until 2030", async () => {
    await start("/me");
    expect(main().textContent).toContain("How your job changes until 2030");
    expect(main().textContent).toContain("Inspection and maintenance");
  });

  it("shows HR how the tasks of a job family change and which profile follows", async () => {
    await start("/hr/tasks/B");
    const tabs = within(screen.getByRole("tablist", { name: "Gap analysis" }));
    expect(tabs.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Competency gaps", "Changing tasks", "Personas"]);
    expect(tabs.getByRole("tab", { name: "Changing tasks" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("link", { name: "Gap analysis" }).getAttribute("aria-current")).toBe("page");
    expect(main().textContent).toContain("Reporting and closing");
    expect(main().textContent).toContain("Largely automated");
    expect(main().textContent).toContain("Data and information literacy");
    expect(main().textContent).toContain("Decisions on the basis of analyses");
    const profile = [...main().querySelectorAll(".card")].find((c) => c.querySelector("h2")?.textContent === "Target profile that follows from the tasks")!;
    expect(profile.querySelectorAll("tbody tr")).toHaveLength(7);
    expect(profile.textContent).toContain("Reporting and closing · AI-assisted knowledge work · Decisions on the basis of analyses");
  });

  it("shows three personas per job family as a simulation", async () => {
    await start("/hr/personas/D");
    const cards = [...main().querySelectorAll(".personas .card")];
    expect(cards.map((c) => c.querySelector("h2")!.textContent)).toEqual(["Beginner", "Advanced", "Expert"]);
    expect(cards.map((c) => c.querySelector(".persona-figure strong")!.textContent)).toEqual(["21%", "57%", "100%"]);
    expect(main().textContent).toContain("Simulated.");
    expect(cards[2].textContent).toContain("None needed");
    expect(cards[0].querySelector(".courses a")).not.toBeNull();
  });

  it("shows all skills per job unit and the roles, never a person", async () => {
    await start("/hr/skills");
    expect(main().querySelectorAll(".heat tbody tr")).toHaveLength(9);
    expect(main().querySelectorAll(".heat thead th")).toHaveLength(10);
    expect(main().textContent).not.toMatch(names);
    click(main().querySelector<HTMLButtonElement>(".cell.openable button")!);
    expect(within(screen.getByRole("dialog")).getByRole("link", { name: "Open the team" })).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    await open("/hr/roles/D");
    expect(main().textContent).toContain("One holder");
    expect(main().textContent).toContain("Maintenance Technician");
    expect(main().textContent).not.toMatch(names);
    expect(within(screen.getByRole("tablist", { name: "Teams" })).getByRole("tab", { name: "Roles" }).getAttribute("aria-selected")).toBe("true");
  });

  it("adapts a job profile from an uploaded job description and takes it back on reset", async () => {
    await start("/team/profiles/D");
    const line = () => [...main().querySelectorAll("details.comp")].find((d) => d.textContent!.includes("Checking and owning AI results"))!.querySelector(".sub")!.textContent;
    expect(line()).toBe("Today: Foundation · 2030: Practitioner");

    await open("/hr/upload/D");
    const read = within(main()).getByRole("button", { name: "Read the tasks" }) as HTMLButtonElement;
    expect(read.disabled).toBe(true);
    click(within(main()).getByRole("button", { name: "Use an example" }));
    expect(read.disabled).toBe(false);
    click(read);
    expect(main().textContent).toContain("targets raised");
    expect(main().textContent).toContain("not part of this family’s profile: Guiding the AI change");
    // The skills of the text, clustered by competency.
    const clusters = [...main().querySelectorAll(".card")].find((c) => c.querySelector("h2")?.textContent === "Skills in this job description")!;
    expect(clusters.querySelectorAll("li").length).toBeGreaterThanOrEqual(4);
    expect(clusters.textContent).toContain("Data and information literacy");
    // The same text under another job family: the tool says where it belongs, and the text stays.
    click(within(main()).getByRole("tab", { name: "Commercial & Corporate Office" }));
    expect((within(main()).getByRole("textbox", { name: /Text, one task per line/ }) as HTMLTextAreaElement).value).toContain("turbines");
    click(within(main()).getByRole("button", { name: "Read the tasks" }));
    expect(main().textContent).toContain("This reads like a job in Engineering & Technicians, not in Commercial & Corporate Office.");
    click(within(main()).getByRole("button", { name: "Use Engineering & Technicians" }));
    expect(within(main()).getByRole("tab", { name: "Engineering & Technicians" }).getAttribute("aria-selected")).toBe("true");
    expect(main().textContent).not.toContain("This reads like a job in");
    click(within(main()).getByRole("button", { name: "Apply to the job profile" }));
    expect(screen.getByRole("status").textContent).toContain("Profile of Engineering & Technicians updated");

    await open("/hr/tasks/D");
    expect(main().textContent).toContain("From the job description “Senior Maintenance Engineer, hydropower (invented example)”");
    await open("/team/profiles/D");
    expect(line()).toBe("Today: Foundation · 2030: Advanced");

    click(screen.getByRole("button", { name: /View as/ }));
    click(screen.getByRole("button", { name: /Reset demo data/ }));
    expect(line()).toBe("Today: Foundation · 2030: Practitioner");
  });

  it("shows HR the path to 2030 and where a measure starts", async () => {
    await start("/hr");
    const path = [...main().querySelectorAll(".card")].find((c) => c.querySelector("h2")?.textContent === "Path to the 2030 profiles")!;
    const figures = [...path.querySelectorAll(".meter-figure")].map((f) => f.textContent);
    expect(figures).toHaveLength(5);
    expect(figures[4]).toBe("100%");
    expect(main().textContent).toContain("Simulated.");
    await open("/hr/measures");
    expect(within(main()).getByRole("link", { name: /AI Fluency: Framework & Foundations/ }).getAttribute("href")).toContain("https://");
    expect(main().textContent).toContain("catalogue entry assumed");
  });
});

// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";

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
    "/me", "/me/check/1", "/me/check/5", "/me/data",
    "/team", "/team/pipeline", "/team/people", "/team/people?stage=agreed", "/team/profiles/D",
    "/team/people/e3", "/team/people/e3/conversation", "/team/people/e3/conversation/check-results",
    "/team/people/e3/conversation/focus", "/team/people/e3/conversation/summary", "/team/people/e3/activity",
    "/team/people/unknown",
    "/hr", "/hr/gaps", "/hr/gaps/baseline", "/hr/teams", "/hr/teams/t8", "/hr/teams/unknown",
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
    expect(within(dialog).getByText(/rated employees already reach the 2030 target/)).toBeTruthy();
    expect(dialog.textContent).not.toMatch(/Anna Berger|Julia Steiner|Stefan Huber/);
    click(screen.getByRole("button", { name: "Close preview" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("the journey of one person", () => {
  it("goes from the self-check through the conversation to the totals for HR", async () => {
    await start("/hr");
    const before = main().querySelector("h1")!.textContent!;
    expect(before).toContain("33 of 63");

    // Employee: self-check, one competency per screen, answers in I-form.
    await open("/me/check/1");
    for (const pick of [1, 2, 1, 0]) {
      const next = within(main()).getByRole("button", { name: /Next|See my answers/ }) as HTMLButtonElement;
      expect(next.disabled).toBe(true);
      // Two questions per competency, four answers each; Next opens once both are answered.
      const radios = within(main()).getAllByRole("radio");
      expect(radios).toHaveLength(8);
      click(radios[pick]);
      expect(next.disabled).toBe(true);
      click(radios[4 + pick]);
      expect(next.disabled).toBe(false);
      click(next);
      await open(window.location.hash.slice(1));
    }
    expect(main().querySelector("h1")!.textContent).toBe("That is your self-check");
    click(within(main()).getByRole("button", { name: "Done" }));
    await open("/me");
    expect(main().textContent).toContain("Your self-check is with Elisabeth Brunner.");

    // Manager: sees the self-check, agrees every level.
    await open("/team/people/e6/conversation");
    expect(main().textContent).toContain("Katharina has done the self-check");
    const levels = { "safe-use": 1, "check-results": 1, "spot-potential": 1, "build-scale": 0 };
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
    expect(main().textContent).toContain("Katharina meets today’s expectations in all 4 competencies.");

    // The employee sees the agreed levels, HR sees one more person.
    await open("/me");
    expect(main().textContent).toContain("Your levels are agreed with Elisabeth Brunner.");
    await open("/hr");
    expect(main().querySelector("h1")!.textContent).toContain("34 of 64");
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
    expect(card.querySelector(".card-aside")!.textContent).toBe("1 of 4");
    const link = card.querySelector<HTMLAnchorElement>("a.row")!;
    expect(link.querySelector(".views")!.getAttribute("aria-label")).toBe("Julia: Practitioner, you: Foundation, agreed: Foundation");
    expect(link.textContent).toContain("Julia rates one step higher · agreed: Foundation");
    expect(link.getAttribute("href")).toBe("#/team/people/e3/conversation/check-results");
  });

  it("shows on the team dashboard who has reached the 2030 target per competency", async () => {
    await start("/team");
    const cells = [...main().querySelectorAll(".matrix tfoot td")].map((td) => td.textContent);
    expect(cells).toEqual(["Julia, Michael", "Anna, Stefan", "Nobody yet", "Annaonly one", "–", "–"]);
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
    expect(tabs.getAllByRole("tab").map((t) => t.textContent?.replace(/\d+$/, ""))).toEqual(["Job families", "Competencies", "Measures"]);
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

  it("names the job-family-specific competencies as the next step", async () => {
    await start("/hr/competencies");
    expect(main().textContent).toContain("Job-family-specific competencies");
  });
});

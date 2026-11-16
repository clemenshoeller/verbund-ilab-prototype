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
  it("switches the role from the menu at the top right", async () => {
    await start();
    click(screen.getByRole("button", { name: /View as Manager/ }));
    const menu = screen.getByRole("menu", { name: "View as" });
    expect(within(menu).getAllByRole("menuitemradio")).toHaveLength(3);
    click(within(menu).getByRole("menuitemradio", { name: /HR/ }));
    await open("/hr");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.getByRole("button", { name: /View as HR/ })).toBeTruthy();
    expect(main().querySelector("h1")!.textContent).toContain("assessed employees meet today");
  });

  it("closes with Escape and resets the demo data with a confirmation", async () => {
    await start();
    click(screen.getByRole("button", { name: /View as/ }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    click(screen.getByRole("button", { name: /View as/ }));
    click(screen.getByRole("menuitem", { name: /Reset demo data/ }));
    expect(screen.getByRole("status").textContent).toContain("Demo data reset");
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
    expect(within(dialog).getByText(/rated employees are below the 2030 target/)).toBeTruthy();
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

    // Employee: self-check, one competency per screen.
    await open("/me/check/1");
    for (const pick of [1, 2, 1, 0]) {
      const next = within(main()).getByRole("button", { name: /Next|See my answers/ }) as HTMLButtonElement;
      expect(next.disabled).toBe(true);
      click(within(main()).getAllByRole("radio")[pick]);
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
    expect((within(main()).getAllByRole("radio")[2] as HTMLElement).getAttribute("aria-checked")).toBe("true");
    click(screen.getByRole("button", { name: /View as/ }));
    click(screen.getByRole("menuitem", { name: /Reset demo data/ }));
    expect((within(main()).getAllByRole("radio")[2] as HTMLElement).getAttribute("aria-checked")).toBe("false");
  });
});

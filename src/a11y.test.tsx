// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";

/**
 * Automated accessibility check (axe-core) of the main screens.
 * Colour contrast is switched off because the simulated browser cannot compute it;
 * it is not checked anywhere else either (see "Known limitations" in the README).
 */
const PAGES = [
  "/",
  "/about",
  "/me",
  "/me/check",
  "/me/check/1",
  "/me/check/3",
  "/me/check/result",
  "/team/people/e2/conversation/check-results",
  "/me/data",
  "/team",
  "/team/pipeline",
  "/team/people",
  "/team/people/e3",
  "/team/people/e3/conversation",
  "/team/people/e3/conversation/check-results",
  "/team/people/e3/conversation/focus",
  "/team/people/e3/conversation/summary",
  "/team/people/e3/activity",
  "/team/profiles/D",
  "/hr",
  "/hr/gaps",
  "/hr/tasks",
  "/hr/personas",
  "/hr/skills",
  "/hr/roles",
  "/hr/upload",
  "/hr/teams",
  "/hr/teams/t8",
  "/hr/competencies",
  "/hr/competencies/safe-use",
  "/hr/measures",
  "/hr/roadmap",
  "/hr/governance",
];

async function open(hash: string) {
  await act(async () => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
}

async function violations() {
  const result = await axe.run(document.body, { rules: { "color-contrast": { enabled: false } } });
  return result.violations.map((v) => `${v.id}: ${v.nodes.length} × ${v.nodes[0].html.slice(0, 110)}`);
}

beforeEach(() => {
  localStorage.clear();
  window.scrollTo = () => {};
  // The simulated browser has no canvas; axe only needs it for the contrast check that is off.
  HTMLCanvasElement.prototype.getContext = () => null;
});
afterEach(() => {
  cleanup();
  window.location.hash = "";
});

describe("accessibility", () => {
  it("finds no violations on any main page", async () => {
    window.location.hash = "/team";
    render(<App />);
    await screen.findByRole("navigation", { name: "Main" });
    const found: Record<string, string[]> = {};
    for (const page of PAGES) {
      await open(page);
      const list = await violations();
      if (list.length) found[page] = list;
    }
    expect(found).toEqual({});
  }, 60000);

  it("finds no violations with the role list, the search results and a preview open", async () => {
    window.location.hash = "/team/people";
    render(<App />);
    await screen.findByRole("navigation", { name: "Main" });
    fireEvent.click(screen.getByRole("button", { name: /View as/ }));
    expect(await violations()).toEqual([]);
    fireEvent.keyDown(document, { key: "Escape" });
    const box = screen.getByRole("combobox", { name: "Search" });
    fireEvent.focus(box);
    fireEvent.change(box, { target: { value: "an" } });
    expect(screen.getAllByRole("option").length).toBeGreaterThan(0);
    expect(await violations()).toEqual([]);
    fireEvent.blur(box);
    fireEvent.click(screen.getByText("Julia Steiner"));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(await violations()).toEqual([]);
  }, 30000);
});

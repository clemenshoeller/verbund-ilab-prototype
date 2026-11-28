import { useEffect, useState } from "react";

/** Minimal hash router: "#/team/people/e3?stage=agreed" becomes ["team", "people", "e3"] plus a query. */
function parse(): string[] {
  const path = window.location.hash.replace(/^#\/?/, "").split("?")[0];
  return path.split("/").filter(Boolean);
}

export function useRoute(): string[] {
  const [route, setRoute] = useState<string[]>(parse);
  useEffect(() => {
    // The new page starts at the top; App scrolls after the new page has rendered, so the old one never flashes at the top.
    const onChange = () => setRoute(parse());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

/** Value of one query parameter in the current address, e.g. the stage filter of a list. */
export function queryParam(name: string): string | null {
  const query = window.location.hash.split("?")[1] ?? "";
  return new URLSearchParams(query).get(name);
}

export function go(path: string): void {
  window.location.hash = path;
}

/** What to restore after a switch between views of the same page. */
interface Stay {
  y: number;
  /** Name of the tab list the switch came from, so the focus can go back to its selected tab. */
  tablist: string | null;
}
let stay: Stay | null = null;

/**
 * Switches between views of the same page, such as the tabs of a card. Unlike `go`, the page keeps
 * its scroll position and the focus stays on the tab that was chosen.
 */
export function switchTo(path: string): void {
  if (window.location.hash === `#${path}`) return;
  const list = document.activeElement?.closest('[role="tablist"]');
  stay = { y: window.scrollY, tablist: list?.getAttribute("aria-label") ?? null };
  go(path);
}

/** The pending switch, if the last navigation was one. Read once by the shell after the new view has rendered. */
export function takeStay(): Stay | null {
  const pending = stay;
  stay = null;
  return pending;
}

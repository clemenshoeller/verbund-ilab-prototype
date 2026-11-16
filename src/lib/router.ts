import { useEffect, useState } from "react";

/** Minimal hash router: "#/team/people/e3?stage=agreed" becomes ["team", "people", "e3"] plus a query. */
function parse(): string[] {
  const path = window.location.hash.replace(/^#\/?/, "").split("?")[0];
  return path.split("/").filter(Boolean);
}

export function useRoute(): string[] {
  const [route, setRoute] = useState<string[]>(parse);
  useEffect(() => {
    const onChange = () => {
      setRoute(parse());
      try {
        window.scrollTo(0, 0);
      } catch {
        // Not available in every environment (tests); the page still changes.
      }
    };
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

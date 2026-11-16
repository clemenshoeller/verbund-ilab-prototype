import { useEffect, useState } from "react";

/** Minimal hash router: "#/gaps/e3" becomes ["gaps", "e3"]. No server configuration needed. */
function parse(): string[] {
  return window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
}

export function useRoute(): string[] {
  const [route, setRoute] = useState<string[]>(parse);
  useEffect(() => {
    const onChange = () => {
      setRoute(parse());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

export function go(path: string): void {
  window.location.hash = path;
}

import { useEffect, useMemo, useRef, useState } from "react";
import { useData } from "../data";
import { go } from "../lib/router";
import { Icon } from "./Icon";

interface Hit {
  label: string;
  kind: string;
  /** Path for the router, e.g. "/team/people/e3". */
  path: string;
}

/**
 * Jump to a record. A manager finds team members; HR finds teams and parts of the competency model, never persons.
 * Built as a combobox: type, move with the arrow keys, open with Enter, leave with Escape.
 */
export function Search({ view }: { view: "team" | "hr" }) {
  const { content, org, team } = useData();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  // Ctrl+K or Cmd+K jumps into the search from anywhere.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const index = useMemo<Hit[]>(() => {
    if (view === "team") {
      return [
        ...team.employees.map((e) => ({ label: e.name, kind: e.role, path: `/team/people/${e.id}` })),
        ...content.families.map((f) => ({ label: f.name, kind: "Target profile", path: `/team/profiles/${f.id}` })),
      ];
    }
    return [
      ...org.teams.map((t) => ({ label: t.name, kind: "Team", path: `/hr/teams/${t.id}` })),
      ...content.families.map((f) => ({ label: f.name, kind: "Job family", path: `/hr/profiles/${f.id}` })),
      ...content.competencies.map((c) => ({ label: c.name, kind: "Competency", path: `/hr/competencies/${c.id}` })),
      ...content.measures.map((m) => ({ label: m.title, kind: "Measure", path: "/hr/measures" })),
    ];
  }, [view, content, org, team]);

  const term = query.trim().toLowerCase();
  const hits = term ? index.filter((h) => `${h.label} ${h.kind}`.toLowerCase().includes(term)).slice(0, 7) : [];
  const shown = open && term !== "";
  const current = Math.min(active, Math.max(0, hits.length - 1));

  const choose = (hit: Hit) => {
    go(hit.path);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="search">
      <Icon name="search" />
      <input
        ref={input}
        type="search"
        role="combobox"
        aria-expanded={shown}
        aria-controls="search-hits"
        aria-autocomplete="list"
        aria-activedescendant={shown && hits[current] ? `search-hit-${current}` : undefined}
        aria-label="Search"
        value={query}
        placeholder={view === "team" ? "Search team members and profiles" : "Search teams, competencies, measures"}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && hits.length) {
            event.preventDefault();
            setOpen(true);
            setActive((current + 1) % hits.length);
          } else if (event.key === "ArrowUp" && hits.length) {
            event.preventDefault();
            setActive((current - 1 + hits.length) % hits.length);
          } else if (event.key === "Enter" && shown && hits[current]) {
            choose(hits[current]);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      <kbd>Ctrl K</kbd>
      {shown && (
        <div id="search-hits" className="search-hits" role="listbox" aria-label="Search results">
          {hits.length === 0 && <p className="none">Nothing found</p>}
          {hits.map((hit, i) => (
            // Mouse down keeps the focus in the field, so the list is still there when the click lands.
            <div
              key={hit.path + hit.label}
              id={`search-hit-${i}`}
              role="option"
              tabIndex={-1}
              aria-selected={i === current}
              className={"hit" + (i === current ? " on" : "")}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(hit)}
              onKeyDown={(event) => event.key === "Enter" && choose(hit)}
            >
              <strong>{hit.label}</strong>
              <span className="sub">{hit.kind}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

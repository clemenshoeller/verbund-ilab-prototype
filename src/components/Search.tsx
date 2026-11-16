import { useEffect, useMemo, useRef, useState } from "react";
import { useData } from "../data";
import { Icon } from "./Icon";

interface Hit {
  label: string;
  kind: string;
  href: string;
}

/** Jump to a record. A manager finds team members; HR finds teams and parts of the competency model, never persons. */
export function Search({ view }: { view: "team" | "hr" }) {
  const { content, org, team } = useData();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
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
        ...team.employees.map((e) => ({ label: e.name, kind: e.role, href: `#/team/people/${e.id}` })),
        ...content.families.map((f) => ({ label: f.name, kind: "Target profile", href: `#/team/profiles/${f.id}` })),
      ];
    }
    return [
      ...org.teams.map((t) => ({ label: t.name, kind: "Team", href: `#/hr/teams/${t.id}` })),
      ...content.families.map((f) => ({ label: f.name, kind: "Job family", href: `#/hr/profiles/${f.id}` })),
      ...content.competencies.map((c) => ({ label: c.name, kind: "Competency", href: `#/hr/competencies/${c.id}` })),
      ...content.measures.map((m) => ({ label: m.title, kind: "Measure", href: `#/hr/measures` })),
    ];
  }, [view, content, org, team]);

  const term = query.trim().toLowerCase();
  const hits = term ? index.filter((h) => `${h.label} ${h.kind}`.toLowerCase().includes(term)).slice(0, 7) : [];

  return (
    <div className="search" onBlur={() => setTimeout(() => setOpen(false), 120)}>
      <Icon name="search" />
      <input
        ref={input}
        type="search"
        value={query}
        placeholder={view === "team" ? "Search team members and profiles" : "Search teams, competencies, measures"}
        aria-label="Search"
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && hits[0]) {
            window.location.hash = hits[0].href.slice(1);
            setQuery("");
          }
          if (event.key === "Escape") setOpen(false);
        }}
      />
      <kbd>Ctrl K</kbd>
      {open && term && (
        <ul className="search-hits">
          {hits.length === 0 && <li className="none">Nothing found</li>}
          {hits.map((hit) => (
            <li key={hit.href + hit.label}>
              <a href={hit.href} onClick={() => setQuery("")}>
                <strong>{hit.label}</strong>
                <span className="sub">{hit.kind}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

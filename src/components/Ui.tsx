import { createContext, useContext, type ReactNode } from "react";
import { stageName, type Stage } from "../lib/workflow";

/** A menu item that holds several pages as tabs, e.g. "Competency model" with job families, competencies and measures. */
export interface Section {
  label: string;
  active: string;
  tabs: { id: string; label: string; href: string; count?: number }[];
}

export const SectionContext = createContext<Section | null>(null);

/** Page title with an optional path back to the list the record belongs to. Inside a section the tabs of that section follow the title. */
export function PageHead({
  crumbs,
  title,
  sub,
  actions,
}: {
  crumbs?: { label: string; href?: string }[];
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
}) {
  const section = useContext(SectionContext);
  // The tabs belong to the overview pages of a section; a single record keeps its own path back.
  const tabs = section && !crumbs ? section : null;
  const path = tabs ? [{ label: tabs.label, href: undefined }] : crumbs;
  return (
    <>
    <div className="page-head">
      <div>
        {path && (
          <p className="crumbs">
            {path.map((crumb, i) => (
              <span key={crumb.label}>
                {i > 0 && " / "}
                {crumb.href ? <a href={crumb.href}>{crumb.label}</a> : crumb.label}
              </span>
            ))}
          </p>
        )}
        <h1 tabIndex={-1}>{title}</h1>
        {sub && <p className="lead">{sub}</p>}
      </div>
      {actions && <div className="head-actions">{actions}</div>}
    </div>
    {tabs && <LinkTabs tabs={tabs.tabs} active={tabs.active} label={tabs.label} />}
    </>
  );
}

/** Two or more ways to look at the same thing, e.g. the team as a list or as a board. Links, so each view has its own address. */
export function ViewToggle({ label, options, active }: { label: string; options: { id: string; label: string; href: string; icon?: ReactNode }[]; active: string }) {
  return (
    <nav className="toggle" aria-label={label}>
      {options.map((option) => (
        <a key={option.id} href={option.href} className={option.id === active ? "on" : ""} aria-current={option.id === active ? "page" : undefined}>
          {option.icon}
          {option.label}
        </a>
      ))}
    </nav>
  );
}

export function Card({ title, aside, children, flush }: { title?: ReactNode; aside?: ReactNode; children: ReactNode; flush?: boolean }) {
  return (
    <section className={"card" + (flush ? " flush" : "")}>
      {(title || aside) && (
        <header className="card-head">
          {title && <h2>{title}</h2>}
          {aside && <span className="card-aside">{aside}</span>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Avatar({ name, small }: { name: string; small?: boolean }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
  const tint = [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 4;
  return (
    <span className={`avatar t${tint}` + (small ? " small" : "")} aria-hidden="true">
      {initials}
    </span>
  );
}

export function StageChip({ stage }: { stage: Stage }) {
  return <span className={"chip stage-" + stage}>{stageName(stage)}</span>;
}

/** Tabs that are links, so every tab of a record has its own address. */
export function LinkTabs({ tabs, active, label }: { tabs: { id: string; label: string; href: string; count?: number }[]; active: string; label?: string }) {
  return (
    <div className="rtabs" role="tablist" aria-label={label}>
      {tabs.map((tab) => (
        <a key={tab.id} role="tab" href={tab.href} aria-selected={tab.id === active} className={tab.id === active ? "on" : ""}>
          {tab.label}
          {tab.count !== undefined && <span className="badge">{tab.count}</span>}
        </a>
      ))}
    </div>
  );
}

export function formatDate(iso?: string | null): string {
  if (!iso) return "–";
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year}`;
}

/** Shown when an address points to a record that does not exist. */
export function NotFound({ what, back, backLabel }: { what: string; back: string; backLabel: string }) {
  return (
    <>
      <PageHead crumbs={[{ label: backLabel, href: back }]} title={`${what} not found`} sub="The address may be wrong, or the record is not part of what you can see in this role." />
      <p>
        <a className="btn" href={back}>
          Back to {backLabel.toLowerCase()}
        </a>
      </p>
    </>
  );
}

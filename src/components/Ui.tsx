import type { ReactNode } from "react";
import { stageName, type Stage } from "../lib/workflow";

/** Page title with an optional path back to the list the record belongs to. */
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
  return (
    <div className="page-head">
      <div>
        {crumbs && (
          <p className="crumbs">
            {crumbs.map((crumb, i) => (
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
export function LinkTabs({ tabs, active }: { tabs: { id: string; label: string; href: string; count?: number }[]; active: string }) {
  return (
    <div className="rtabs" role="tablist">
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

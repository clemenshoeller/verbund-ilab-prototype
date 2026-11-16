import { useEffect, useRef, useState } from "react";
import { useData } from "../data";
import { useUi } from "../ui";
import { Icon } from "./Icon";
import { Avatar } from "./Ui";

export type View = "me" | "team" | "hr";

/**
 * PROVISIONAL role switch: a real tool would take the role from the login.
 * A button that opens a list of links; reachable with Tab, closed with Escape.
 */
export function ViewAs({ view }: { view: View }) {
  const { org, team, reset } = useData();
  const { toast } = useUi();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const me = org.employees.find((e) => e.id === org.currentEmployeeId) ?? org.employees[0];

  const roles: { id: View; role: string; name: string; hint: string }[] = [
    { id: "me", role: "Employee", name: me.name, hint: "The own profile and self-check" },
    { id: "team", role: "Manager", name: team.info.manager, hint: `The team ${team.info.name}` },
    { id: "hr", role: "HR", name: org.hrUser.name, hint: "The whole organisation, as totals" },
  ];
  const current = roles.find((r) => r.id === view) ?? roles[1];

  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) button.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    // Choosing a link closes the list, also when it leads to the page that is already open.
    const onClick = (event: MouseEvent) => {
      if ((event.target as Element).closest?.(".menu a")) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [open]);

  return (
    <div className="viewas" ref={box}>
      <button ref={button} type="button" className="viewas-btn" aria-expanded={open} aria-controls="viewas-list" onClick={() => setOpen((o) => !o)}>
        <Avatar name={current.name} small />
        <span className="viewas-text">
          <span className="viewas-label">View as {current.role}</span>
          <strong>{current.name}</strong>
        </span>
        <Icon name="chevron" size={16} />
      </button>
      {open && (
        <nav id="viewas-list" className="menu" aria-label="View as">
          <p className="menu-title">View as</p>
          <ul>
            {roles.map((role) => (
              <li key={role.id}>
                <a className={"menu-item" + (role.id === view ? " on" : "")} href={`#/${role.id}`} aria-current={role.id === view ? "true" : undefined}>
                  <Avatar name={role.name} small />
                  <span>
                    <strong>{role.role}</strong>
                    <span className="sub">
                      {role.name} · {role.hint}
                    </span>
                  </span>
                  {role.id === view && <Icon name="check" size={16} />}
                </a>
              </li>
            ))}
          </ul>
          <ul className="menu-more">
            <li>
              <a className="menu-item plain" href="#/">
                <Icon name="info" /> Start page
              </a>
            </li>
            <li>
              <a className="menu-item plain" href="#/about">
                <Icon name="database" /> Data model and status
              </a>
            </li>
            <li>
              <button
                type="button"
                className="menu-item plain"
                onClick={() => {
                  reset();
                  close(true);
                  toast("Demo data reset to the sample state");
                }}
              >
                <Icon name="reset" /> Reset demo data
              </button>
            </li>
          </ul>
          <p className="menu-note">Provisional switch. The prototype has no login.</p>
        </nav>
      )}
    </div>
  );
}

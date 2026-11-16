import { useEffect, useRef, useState } from "react";
import { useData } from "../data";
import { useUi } from "../ui";
import { Icon } from "./Icon";
import { Avatar } from "./Ui";

export type View = "me" | "team" | "hr";

/**
 * PROVISIONAL role switch: a real tool would take the role from the login.
 * Shows who you are looking as, and lets you change it.
 */
export function ViewAs({ view }: { view: View }) {
  const { org, team, reset } = useData();
  const { toast } = useUi();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const me = org.employees.find((e) => e.id === org.currentEmployeeId) ?? org.employees[0];

  const roles: { id: View; role: string; name: string; hint: string }[] = [
    { id: "me", role: "Employee", name: me.name, hint: "The own profile and self-check" },
    { id: "team", role: "Manager", name: team.info.manager, hint: `The team ${team.info.name}` },
    { id: "hr", role: "HR", name: "Demo HR", hint: "The whole organisation, as totals" },
  ];
  const current = roles.find((r) => r.id === view)!;

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => !box.current?.contains(event.target as Node) && setOpen(false);
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="viewas" ref={box}>
      <button type="button" className="viewas-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Avatar name={current.name} small />
        <span className="viewas-text">
          <span className="viewas-label">View as {current.role}</span>
          <strong>{current.name}</strong>
        </span>
        <Icon name="chevron" size={16} />
      </button>
      {open && (
        <div className="menu" role="menu" aria-label="View as">
          <p className="menu-title">View as</p>
          {roles.map((role) => (
            <a key={role.id} role="menuitemradio" aria-checked={role.id === view} className={"menu-item" + (role.id === view ? " on" : "")} href={`#/${role.id}`} onClick={() => setOpen(false)}>
              <Avatar name={role.name} small />
              <span>
                <strong>{role.role}</strong>
                <span className="sub">
                  {role.name} · {role.hint}
                </span>
              </span>
              {role.id === view && <Icon name="check" size={16} />}
            </a>
          ))}
          <hr />
          <a role="menuitem" className="menu-item plain" href="#/guide" onClick={() => setOpen(false)}>
            <Icon name="info" /> How it works
          </a>
          <a role="menuitem" className="menu-item plain" href="#/about" onClick={() => setOpen(false)}>
            <Icon name="database" /> Data model and status
          </a>
          <button
            type="button"
            role="menuitem"
            className="menu-item plain"
            onClick={() => {
              reset();
              setOpen(false);
              toast("Demo data reset to the sample state");
            }}
          >
            <Icon name="reset" /> Reset demo data
          </button>
          <p className="menu-note">Provisional switch. The prototype has no login.</p>
        </div>
      )}
    </div>
  );
}

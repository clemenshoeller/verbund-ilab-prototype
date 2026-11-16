import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

/** What the preview panel on the right can show. */
export type DrawerSpec =
  | { type: "person"; id: string }
  | { type: "team"; id: string }
  | { type: "competency"; id: string }
  | { type: "cell"; familyId: string; competencyId: string };

interface Toast {
  id: number;
  text: string;
}

interface Ui {
  /** Short confirmation after an action, shown for a few seconds. */
  toast: (text: string) => void;
  toasts: Toast[];
  drawer: DrawerSpec | null;
  openDrawer: (spec: DrawerSpec) => void;
  closeDrawer: () => void;
}

const UiContext = createContext<Ui | null>(null);

export function useUi(): Ui {
  const ui = useContext(UiContext);
  if (!ui) throw new Error("UiContext is missing");
  return ui;
}

export function UiProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [drawer, setDrawer] = useState<DrawerSpec | null>(null);
  const nextId = useRef(1);

  const toast = useCallback((text: string) => {
    const id = nextId.current++;
    setToasts((list) => [...list.slice(-2), { id, text }]);
    window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 3200);
  }, []);
  const openDrawer = useCallback((spec: DrawerSpec) => setDrawer(spec), []);
  const closeDrawer = useCallback(() => setDrawer(null), []);

  // Moving to another page closes the preview; Escape closes it too.
  useEffect(() => {
    const onHash = () => setDrawer(null);
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setDrawer(null);
    window.addEventListener("hashchange", onHash);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return <UiContext.Provider value={{ toast, toasts, drawer, openDrawer, closeDrawer }}>{children}</UiContext.Provider>;
}

export function Toasts() {
  const { toasts } = useUi();
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <span className="toast-mark">✓</span>
          {t.text}
        </div>
      ))}
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import type { Assessments, AssignmentStatus, Assignments, Rating, TaskChange, Uploads } from "../types";

/** Demo state lives in the browser only. "Reset demo data" deletes it. */
export const STORAGE_KEY = "ai-competency-check.state.v5";

/** How many competencies a person works on at a time. Guidance suggests one or two, three at most. */
export const MAX_FOCUS = 2;

interface Seed {
  assessments: Assessments;
  assignments: Assignments;
}

interface State extends Seed {
  /** Tasks from uploaded job descriptions, by job family. */
  uploads: Uploads;
}

/** Short fingerprint of the sample data, so saved edits are dropped when the data underneath changes. */
function fingerprint(seed: Seed): string {
  const text = JSON.stringify(seed);
  let hash = 5381;
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  return `${text.length}:${hash}`;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/** Accepts only a saved state with the expected shape that belongs to the current sample data. */
export function readSaved(raw: string | null, seedPrint: string): State | null {
  if (!raw) return null;
  try {
    const saved: unknown = JSON.parse(raw);
    if (!isRecord(saved) || saved.seed !== seedPrint) return null;
    const { assessments, assignments } = saved;
    // Saved states from before the upload existed have no uploads.
    const uploads = saved.uploads ?? {};
    if (!isRecord(assessments) || !isRecord(assignments) || !isRecord(uploads)) return null;
    const assessmentsOk = Object.values(assessments).every((a) => isRecord(a) && typeof a.status === "string" && isRecord(a.ratings));
    const assignmentsOk = Object.values(assignments).every((list) => Array.isArray(list) && list.every((a) => isRecord(a) && typeof a.measureId === "string"));
    const uploadsOk = Object.values(uploads).every((list) => Array.isArray(list) && list.every((t) => isRecord(t) && typeof t.task === "string" && isRecord(t.needs2030)));
    return assessmentsOk && assignmentsOk && uploadsOk ? ({ assessments, assignments, uploads } as unknown as State) : null;
  } catch {
    return null;
  }
}

const fresh = (seed: Seed): State => ({ ...structuredClone(seed), uploads: {} });

function load(seed: Seed, seedPrint: string): { state: State; fromStorage: boolean } {
  try {
    const saved = readSaved(localStorage.getItem(STORAGE_KEY), seedPrint);
    if (saved) return { state: saved, fromStorage: true };
    // Unreadable, outdated or foreign content is removed instead of being loaded.
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage blocked: the demo still works until the page is reloaded.
  }
  return { state: fresh(seed), fromStorage: false };
}

const emptyRating: Rating = { self: null, manager: null, agreed: null, note: "" };
const today = () => new Date().toISOString().slice(0, 10);

export function useStore(seed: Seed) {
  const [seedPrint] = useState(() => fingerprint(seed));
  const [initial] = useState(() => load(seed, seedPrint));
  const [state, setState] = useState<State>(initial.state);
  // Nothing is written until the user changes something.
  const [dirty, setDirty] = useState(initial.fromStorage);

  useEffect(() => {
    if (!dirty) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ seed: seedPrint, ...state }));
    } catch {
      // Without storage the demo still works until the page is reloaded.
    }
  }, [state, dirty, seedPrint]);

  const change = useCallback((update: (prev: State) => State) => {
    setDirty(true);
    setState(update);
  }, []);

  /**
   * A rating entered in the conversation. A conversation that is already completed stays completed;
   * a note alone does not change its date.
   */
  const setRating = useCallback(
    (employeeId: string, competencyId: string, patch: Partial<Rating>) => {
      change((prev) => {
        const current = prev.assessments[employeeId] ?? { status: "open" as const, date: null, ratings: {} };
        const rating = { ...emptyRating, ...current.ratings[competencyId], ...patch };
        const onlyNote = Object.keys(patch).every((key) => key === "note");
        const assessment = {
          ...current,
          status: current.status === "completed" ? ("completed" as const) : ("in-progress" as const),
          date: onlyNote && current.date ? current.date : today(),
          ratings: { ...current.ratings, [competencyId]: rating },
        };
        return { ...prev, assessments: { ...prev.assessments, [employeeId]: assessment } };
      });
    },
    [change],
  );

  /**
   * Self-check of the employee: fills the self-rating without starting the conversation.
   * A self-check that starts here is private until the employee shares it.
   */
  const setSelf = useCallback(
    (employeeId: string, competencyId: string, patch: { self?: number | null; selfNote?: string; selfAnswers?: (number | null)[]; selfTask?: string }) => {
      change((prev) => {
        const current = prev.assessments[employeeId] ?? { status: "open" as const, date: null, ratings: {}, selfShared: false };
        const rating = { ...emptyRating, ...current.ratings[competencyId], ...patch };
        return { ...prev, assessments: { ...prev.assessments, [employeeId]: { ...current, ratings: { ...current.ratings, [competencyId]: rating } } } };
      });
    },
    [change],
  );

  /** The employee shares the self-check with the manager, or takes it back. */
  const shareSelf = useCallback(
    (employeeId: string, shared: boolean) => {
      change((prev) => {
        const current = prev.assessments[employeeId];
        if (!current) return prev;
        return { ...prev, assessments: { ...prev.assessments, [employeeId]: { ...current, selfShared: shared } } };
      });
    },
    [change],
  );

  /** HR applies the tasks read from a job description to a job family. */
  const addUpload = useCallback(
    (familyId: string, tasks: TaskChange[]) => {
      change((prev) => {
        const existing = prev.uploads[familyId] ?? [];
        const added = tasks.map((task, i) => ({ ...task, id: `${familyId}-upload-${existing.length + i + 1}` }));
        return { ...prev, uploads: { ...prev.uploads, [familyId]: [...existing, ...added] } };
      });
    },
    [change],
  );

  const clearUploads = useCallback(
    (familyId: string) => {
      change((prev) => ({ ...prev, uploads: { ...prev.uploads, [familyId]: [] } }));
    },
    [change],
  );

  const setFocus = useCallback(
    (employeeId: string, focus: string[]) => {
      change((prev) => {
        const current = prev.assessments[employeeId];
        if (!current) return prev;
        return { ...prev, assessments: { ...prev.assessments, [employeeId]: { ...current, focus: focus.slice(0, MAX_FOCUS) } } };
      });
    },
    [change],
  );

  const complete = useCallback(
    (employeeId: string) => {
      change((prev) => {
        const current = prev.assessments[employeeId];
        if (!current) return prev;
        return { ...prev, assessments: { ...prev.assessments, [employeeId]: { ...current, status: "completed", date: today() } } };
      });
    },
    [change],
  );

  const assign = useCallback(
    (employeeId: string, measureId: string) => {
      change((prev) => {
        const list = prev.assignments[employeeId] ?? [];
        if (list.some((a) => a.measureId === measureId)) return prev;
        return { ...prev, assignments: { ...prev.assignments, [employeeId]: [...list, { measureId, status: "planned", date: today() }] } };
      });
    },
    [change],
  );

  const setAssignmentStatus = useCallback(
    (employeeId: string, measureId: string, status: AssignmentStatus) => {
      change((prev) => ({
        ...prev,
        assignments: {
          ...prev.assignments,
          [employeeId]: (prev.assignments[employeeId] ?? []).map((a) => (a.measureId === measureId ? { ...a, status } : a)),
        },
      }));
    },
    [change],
  );

  const unassign = useCallback(
    (employeeId: string, measureId: string) => {
      change((prev) => ({
        ...prev,
        assignments: { ...prev.assignments, [employeeId]: (prev.assignments[employeeId] ?? []).filter((a) => a.measureId !== measureId) },
      }));
    },
    [change],
  );

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing stored, nothing to remove.
    }
    setDirty(false);
    setState(fresh(seed));
  }, [seed]);

  return { ...state, setRating, setSelf, shareSelf, setFocus, complete, assign, setAssignmentStatus, unassign, addUpload, clearUploads, reset };
}

export type Store = ReturnType<typeof useStore>;

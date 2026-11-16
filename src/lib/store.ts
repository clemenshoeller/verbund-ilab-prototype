import { useCallback, useEffect, useState } from "react";
import type { Assessments, AssignmentStatus, Assignments, Rating } from "../types";

/** Demo state lives in the browser only. "Reset demo data" deletes it. */
const STORAGE_KEY = "ai-competency-check.state.v4";

interface State {
  assessments: Assessments;
  assignments: Assignments;
}

function load(seed: State): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as State;
  } catch {
    // Storage blocked or content unreadable: fall back to the sample data.
  }
  return structuredClone(seed);
}

/** How many competencies a person works on at a time. Guidance suggests one or two, three at most. */
export const MAX_FOCUS = 2;

const emptyRating: Rating = { self: null, manager: null, agreed: null, note: "" };
const today = () => new Date().toISOString().slice(0, 10);

export function useStore(seed: State) {
  const [state, setState] = useState<State>(() => load(seed));

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Without storage the demo still works until the page is reloaded.
    }
  }, [state]);

  const setRating = useCallback((employeeId: string, competencyId: string, patch: Partial<Rating>) => {
    setState((prev) => {
      const current = prev.assessments[employeeId] ?? { status: "open", date: null, ratings: {} };
      const rating = { ...emptyRating, ...current.ratings[competencyId], ...patch };
      const assessment = { ...current, status: "in-progress" as const, date: today(), ratings: { ...current.ratings, [competencyId]: rating } };
      return { ...prev, assessments: { ...prev.assessments, [employeeId]: assessment } };
    });
  }, []);

  /** Self-check of the employee before the talk: fills the self-rating without starting the conversation. */
  const setSelf = useCallback((employeeId: string, competencyId: string, patch: { self?: number; selfNote?: string }) => {
    setState((prev) => {
      const current = prev.assessments[employeeId] ?? { status: "open" as const, date: null, ratings: {} };
      const rating = { ...emptyRating, ...current.ratings[competencyId], ...patch };
      return { ...prev, assessments: { ...prev.assessments, [employeeId]: { ...current, ratings: { ...current.ratings, [competencyId]: rating } } } };
    });
  }, []);

  const setFocus = useCallback((employeeId: string, focus: string[]) => {
    setState((prev) => {
      const current = prev.assessments[employeeId];
      if (!current) return prev;
      return { ...prev, assessments: { ...prev.assessments, [employeeId]: { ...current, focus: focus.slice(0, MAX_FOCUS) } } };
    });
  }, []);

  const complete = useCallback((employeeId: string) => {
    setState((prev) => {
      const current = prev.assessments[employeeId];
      if (!current) return prev;
      return { ...prev, assessments: { ...prev.assessments, [employeeId]: { ...current, status: "completed", date: today() } } };
    });
  }, []);

  const assign = useCallback((employeeId: string, measureId: string) => {
    setState((prev) => {
      const list = prev.assignments[employeeId] ?? [];
      if (list.some((a) => a.measureId === measureId)) return prev;
      return { ...prev, assignments: { ...prev.assignments, [employeeId]: [...list, { measureId, status: "planned", date: today() }] } };
    });
  }, []);

  const setAssignmentStatus = useCallback((employeeId: string, measureId: string, status: AssignmentStatus) => {
    setState((prev) => ({
      ...prev,
      assignments: {
        ...prev.assignments,
        [employeeId]: (prev.assignments[employeeId] ?? []).map((a) => (a.measureId === measureId ? { ...a, status } : a)),
      },
    }));
  }, []);

  const unassign = useCallback((employeeId: string, measureId: string) => {
    setState((prev) => ({
      ...prev,
      assignments: { ...prev.assignments, [employeeId]: (prev.assignments[employeeId] ?? []).filter((a) => a.measureId !== measureId) },
    }));
  }, []);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing stored, nothing to remove.
    }
    setState(structuredClone(seed));
  }, [seed]);

  return { ...state, setRating, setSelf, setFocus, complete, assign, setAssignmentStatus, unassign, reset };
}

export type Store = ReturnType<typeof useStore>;

import { useCallback, useEffect, useState } from "react";
import type { Assessment, Rating } from "../types";

/** Demo state lives in the browser only. "Reset demo data" deletes it. */
const STORAGE_KEY = "ai-competency-check.assessments.v1";

type Assessments = Record<string, Assessment>;

function load(seed: Assessments): Assessments {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Assessments;
  } catch {
    // Storage blocked or content unreadable: fall back to the sample data.
  }
  return structuredClone(seed);
}

const emptyRating: Rating = { self: null, manager: null, agreed: null, note: "" };

export function useAssessments(seed: Assessments) {
  const [assessments, setAssessments] = useState<Assessments>(() => load(seed));

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(assessments));
    } catch {
      // Without storage the demo still works until the page is reloaded.
    }
  }, [assessments]);

  const setRating = useCallback((employeeId: string, competencyId: string, patch: Partial<Rating>) => {
    setAssessments((prev) => {
      const current = prev[employeeId] ?? { status: "open", date: null, ratings: {} };
      const rating = { ...emptyRating, ...current.ratings[competencyId], ...patch };
      return {
        ...prev,
        [employeeId]: {
          ...current,
          status: "in-progress",
          date: new Date().toISOString().slice(0, 10),
          ratings: { ...current.ratings, [competencyId]: rating },
        },
      };
    });
  }, []);

  const complete = useCallback((employeeId: string) => {
    setAssessments((prev) => {
      const current = prev[employeeId];
      if (!current) return prev;
      return { ...prev, [employeeId]: { ...current, status: "completed", date: new Date().toISOString().slice(0, 10) } };
    });
  }, []);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing stored, nothing to remove.
    }
    setAssessments(structuredClone(seed));
  }, [seed]);

  return { assessments, setRating, complete, reset };
}

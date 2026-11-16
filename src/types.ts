export interface Level {
  value: number;
  name: string;
  short: string;
}

export interface Group {
  id: string;
  name: string;
}

export interface Competency {
  id: string;
  group: string;
  name: string;
  description: string;
  /** Opening question for the competency conversation. */
  question: string;
  /** One descriptor per level, index 0 = level 1. */
  levels: string[];
}

export interface ProfileEntry {
  /** Level expected today. */
  baseline: number;
  /** Level expected in 2030. */
  target: number;
}

export interface Family {
  id: string;
  name: string;
  summary: string;
  example: string;
  /** Competencies missing here are not part of the family's profile. */
  profile: Record<string, ProfileEntry>;
}

export interface Content {
  levels: Level[];
  groups: Group[];
  competencies: Competency[];
  families: Family[];
  measures: Record<string, string[]>;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  family: string;
}

export interface Rating {
  self: number | null;
  manager: number | null;
  agreed: number | null;
  note: string;
}

export type AssessmentStatus = "open" | "in-progress" | "completed";

export interface Assessment {
  status: AssessmentStatus;
  date: string | null;
  ratings: Record<string, Rating>;
}

export interface Team {
  manager: { name: string; unit: string };
  employees: Employee[];
  assessments: Record<string, Assessment>;
}

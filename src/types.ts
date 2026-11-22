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
  /** One sentence on why the competency matters. */
  why: string;
  /** What it looks like in daily work, per job family id. */
  examples: Record<string, string>;
  /** Questions of the employee self-check; answers in I-form, index 0 = not yet, 1 to 3 = levels. */
  selfCheck?: SelfQuestion[];
}

export interface SelfQuestion {
  question: string;
  answers: string[];
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

export interface MeasureType {
  id: string;
  name: string;
  short: string;
  /** False for measures of the organisation, such as recruiting, that are not agreed with one person. */
  perPerson: boolean;
}

export interface Measure {
  id: string;
  type: string;
  title: string;
  description: string;
  /** Competencies this measure helps to build. */
  competencies: string[];
}

export interface RoadmapPhase {
  period: string;
  title: string;
  current?: boolean;
  items: string[];
}

export interface Governance {
  roles: { role: string; who: string; tasks: string }[];
  cycle: { when: string; what: string; detail: string }[];
  rules: string[];
}

export interface Content {
  levels: Level[];
  groups: Group[];
  competencies: Competency[];
  families: Family[];
  measureTypes: MeasureType[];
  measures: Measure[];
  roadmap: RoadmapPhase[];
  governance: Governance;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  family: string;
  team: string;
}

export interface Rating {
  self: number | null;
  manager: number | null;
  agreed: number | null;
  note: string;
  /** Example from the own work the employee gave in the self-check. */
  selfNote?: string;
  /** Answer per self-check question (0 = not yet, 1 to 3 = level); `self` follows from them. */
  selfAnswers?: (number | null)[];
}

export type AssessmentStatus = "open" | "in-progress" | "completed";

export interface Assessment {
  status: AssessmentStatus;
  date: string | null;
  ratings: Record<string, Rating>;
  /** Competencies manager and employee chose to work on first (at most two). */
  focus?: string[];
}

export type AssignmentStatus = "planned" | "running" | "done";

/** A measure agreed for one person. */
export interface Assignment {
  measureId: string;
  status: AssignmentStatus;
  date: string;
}

export type Assignments = Record<string, Assignment[]>;

export interface TeamInfo {
  id: string;
  name: string;
  manager: string;
}

export interface Org {
  /** Team of the demo manager shown in the manager role. */
  currentTeamId: string;
  /** Demo employee shown in the employee role. */
  currentEmployeeId: string;
  /** Demo person shown in the HR role. */
  hrUser: { name: string; role: string };
  teams: TeamInfo[];
  employees: Employee[];
  assessments: Record<string, Assessment>;
  assignments: Assignments;
}

export type Assessments = Record<string, Assessment>;

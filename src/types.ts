export interface Level {
  value: number;
  name: string;
  short: string;
}

export interface Group {
  id: string;
  name: string;
  /** Who the group is for, e.g. "For managers". */
  note?: string;
}

export interface Competency {
  id: string;
  group: string;
  name: string;
  /** Name in VERBUND's competency model (German). */
  original?: string;
  description: string;
  /** Full definition from VERBUND's competency model, translated. */
  definition?: string;
  /** Opening question for the competency conversation. */
  question: string;
  /** One descriptor per level, index 0 = level 1. */
  levels: string[];
  /** One sentence on why the competency matters. */
  why: string;
  /** Behaviour anchors from VERBUND's competency model: too little, good, too much. */
  anchors?: { weak: string[]; good: string[]; overdone: string[] };
  /** What it looks like in daily work, per job family id. */
  examples: Record<string, string>;
  /** Cases of the employee self-check: a situation from work and what the person would do. */
  cases?: CaseTask[];
  /** Written tasks of the self-check: something from the own work, described in the own words and read by the manager. */
  tasks?: WorkTask[];
  /** Sub-skills the competency covers in the team's framework. */
  includes?: string;
  /** Interviews of the team that name the skill, by interview id. */
  interviews?: string[];
}

/**
 * A skill beyond AI that the team's interviews say gains importance (framework by Elena Hametner).
 * Not every one is assessed in the tool; `inTool` names the competency that covers it.
 */
export interface FurtherSkill {
  name: string;
  why: string;
  interviews: string[];
  inTool?: string;
}

/**
 * A task of the self-check that is answered in writing: what the person did in a real situation.
 * No level is derived from it automatically; the manager reads it in the conversation.
 */
export interface WorkTask {
  id: string;
  /** Job families the task is written for; missing = every family that has the competency. */
  families?: string[];
  title: string;
  /** What to think of or to do. */
  task: string;
  /** What to write about, as short questions. */
  prompts: string[];
  /** What the manager looks for in the answer, per level; index 0 = level 1. */
  lookFor: string[];
  minutes: number;
}

/** One answer to a case. The level it shows (0 = not yet, 1 to 3 = levels) is never shown while answering. */
export interface CaseOption {
  text: string;
  level: number;
}

/** A case of the self-check: a concrete situation and four ways to handle it, one per level, in mixed order. */
export interface CaseTask {
  id: string;
  /** Job families the case is written for; missing = every family that has the competency. */
  families?: string[];
  title: string;
  situation: string;
  options: CaseOption[];
  /** Time the case takes, for the time budget of the whole self-check. */
  minutes: number;
}

/** A common task of a job family: what it looks like today, what it looks like in 2030, and what it asks for. */
export interface TaskChange {
  id: string;
  task: string;
  today: string;
  future: string;
  /** How AI changes the task until 2030. */
  change: "automated" | "augmented" | "new" | "stable";
  /** Level per competency the task needs today. */
  needsToday: Record<string, number>;
  /** Level per competency the task needs in 2030. */
  needs2030: Record<string, number>;
  /** Set for tasks that came from an uploaded job description. */
  source?: string;
  /** Set for tasks that belong to a role profile: the name of that profile. */
  role?: string;
}

/**
 * The tasks of one job role, read from its job description. HR creates role profiles; a manager
 * assigns one to the team members who hold the role. A role profile can raise 2030 targets above
 * those of the job family, for these people only.
 */
export interface RoleProfile {
  id: string;
  name: string;
  /** Job family the role belongs to. */
  family: string;
  summary: string;
  tasks: TaskChange[];
}

/** An example profile that stands in for the unknown current state: a beginner, an advanced user, an expert. */
export interface Persona {
  id: string;
  name: string;
  role: string;
  story: string;
  /** Level per competency of the family's profile. */
  levels: Record<string, number>;
}

/** Where to learn it: a link to a course or video. The learning itself happens outside the tool. */
export interface CourseLink {
  title: string;
  provider: string;
  format: string;
  /** Missing for entries of VERBUND's own catalogue, which the project assumes to exist. */
  url?: string;
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
  /** Common tasks today and in 2030; the target profile follows from what they need. */
  tasks?: TaskChange[];
  /** Example profiles used as a simulated current state. */
  personas?: Persona[];
  /** Where the tasks and levels come from. */
  basis?: string;
  /** Set on the profile of a person with a role profile: the job family with the targets and tasks of the role added. */
  role?: { id: string; name: string };
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
  /** Job families the measure is meant for; missing = all. */
  families?: string[];
  /** Courses or videos to start with. */
  courses?: CourseLink[];
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
  /** Second layer of the framework: skills beyond AI, with the interviews behind them. */
  furtherSkills?: FurtherSkill[];
  /** Role profiles that come with the sample content; HR can add more in the app. */
  roleProfiles?: RoleProfile[];
  /** Derived, never part of the content file: the profile of each person who has a role profile, by employee id. */
  personal?: Record<string, Family>;
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
  /** Chosen option per case of the self-check (index into the case's options); `self` follows from them. */
  selfAnswers?: (number | null)[];
  /** What the employee wrote in the written task of the self-check; empty = no example given. */
  selfTask?: string;
}

export type AssessmentStatus = "open" | "in-progress" | "completed";

export interface Assessment {
  status: AssessmentStatus;
  date: string | null;
  ratings: Record<string, Rating>;
  /** Competencies manager and employee chose to work on first (at most two). */
  focus?: string[];
  /** False while the employee keeps the self-check for the own development; anything else counts as shared with the manager. */
  selfShared?: boolean;
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
  /** Role profile per employee, by employee id. */
  roles?: RoleOf;
}

/** Which role profile a person has, by employee id. */
export type RoleOf = Record<string, string>;

export type Assessments = Record<string, Assessment>;

/** Tasks HR added to a job family from uploaded job descriptions, by family id. */
export type Uploads = Record<string, TaskChange[]>;

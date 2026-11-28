import type { Content, Family, ProfileEntry, TaskChange, Uploads } from "../types";

/**
 * From tasks to the target profile: a job family needs, per competency, the highest level any of
 * its tasks asks for, today and in 2030. This is how the 2030 target is calculated in advance.
 */
export function deriveProfile(tasks: TaskChange[]): Record<string, ProfileEntry> {
  const profile: Record<string, ProfileEntry> = {};
  const entry = (id: string) => (profile[id] ??= { baseline: 0, target: 0 });
  for (const task of tasks) {
    for (const [id, level] of Object.entries(task.needsToday)) entry(id).baseline = Math.max(entry(id).baseline, level);
    for (const [id, level] of Object.entries(task.needs2030)) entry(id).target = Math.max(entry(id).target, level);
  }
  // A level needed today is needed in 2030 as well.
  for (const item of Object.values(profile)) item.target = Math.max(item.target, item.baseline);
  return profile;
}

/** Tasks per competency that set its 2030 level, for the explanation next to a target. */
export function tasksBehind(family: Family, competencyId: string): TaskChange[] {
  const target = family.profile[competencyId]?.target ?? 0;
  return (family.tasks ?? []).filter((task) => target > 0 && task.needs2030[competencyId] === target);
}

export interface ProfileChange {
  competencyId: string;
  from: number;
  to: number;
}

/**
 * What uploaded tasks change in a profile. An upload can raise the 2030 target of a competency
 * that is already part of the profile; lowering a target or adding a competency stays with the owner of the model.
 */
export function profileChanges(family: Family, tasks: TaskChange[], maxLevel: number): ProfileChange[] {
  const changes: ProfileChange[] = [];
  for (const [competencyId, entry] of Object.entries(family.profile)) {
    if (entry.target <= 0) continue;
    const needed = Math.min(maxLevel, Math.max(0, ...tasks.map((task) => task.needs2030[competencyId] ?? 0)));
    if (needed > entry.target) changes.push({ competencyId, from: entry.target, to: needed });
  }
  return changes;
}

/** The content with the tasks from uploaded job descriptions added and the target profiles adapted to them. */
export function withUploads(content: Content, uploads: Uploads): Content {
  if (Object.values(uploads).every((tasks) => tasks.length === 0)) return content;
  const families = content.families.map((family) => {
    const added = uploads[family.id] ?? [];
    if (added.length === 0) return family;
    const profile = { ...family.profile };
    for (const change of profileChanges(family, added, content.levels.length)) {
      profile[change.competencyId] = { ...profile[change.competencyId], target: change.to };
    }
    return { ...family, profile, tasks: [...(family.tasks ?? []), ...added] };
  });
  return { ...content, families };
}

/*
 * MOCKED: reading a job description. Keyword rules in the browser stand in for a language model.
 * They look at one line at a time: which competencies the line points to, and whether it speaks of
 * supporting a task (level 1), doing it (level 2) or being responsible for it across the unit (level 3).
 * English and German stems, because VERBUND's job descriptions are in German.
 */
const SIGNALS: { competency: string; words: string[] }[] = [
  { competency: "safe-use", words: ["data protection", "confidential", "compliance", "gdpr", "security", "sensitive", "datenschutz", "vertraulich", "sicherheit", "dsgvo"] },
  { competency: "check-results", words: ["review", "verif", "validat", "quality", "plausib", "audit", "sign-off", "sign off", "prüf", "kontroll", "qualität", "freigabe"] },
  { competency: "spot-potential", words: ["improv", "optimi", "innovation", "potential", "use case", "identify", "verbesser", "optimier", "potenzial", "anwendungsf"] },
  { competency: "build-scale", words: ["automat", "develop", "implement", "build", "workflow", "prompt", "roll out", "rollout", "entwickl", "umsetz", "skalier"] },
  { competency: "steer-use", words: ["strategy", "priorit", "budget", "roadmap", "strategie", "steuer"] },
  { competency: "guide-change", words: ["change", "coach", "enable", "train the", "culture", "wandel", "befähig", "schulung", "veränderung"] },
  { competency: "data-work", words: ["data", "report", "analy", "kpi", "dashboard", "daten", "bericht", "kennzahl", "auswert"] },
  { competency: "adapt-learn", words: ["new tool", "new technolog", "learn", "adapt", "lernen", "weiterbild", "neue technolog", "neue tools"] },
  { competency: "process-solve", words: ["process", "problem", "troubleshoot", "root cause", "coordinat", "prozess", "störung", "fehler", "koordin"] },
];
const OWNS = ["responsible for", "lead", "owner", "define", "design", "architect", "across", "concept", "standard", "verantwort", "leit", "konzept", "definier", "übergreifend"];
const SUPPORTS = ["support", "assist", "help", "contribute", "unterstütz", "mitarbeit", "mitwirk"];
const AI = /\b(ai|ki|llm|genai|copilot)\b|artificial intelligence|künstliche intelligenz|machine learning|generativ|assistant|predictive|automat/i;

export interface Analysis {
  tasks: TaskChange[];
  /** Lines that pointed to no competency. */
  skipped: number;
  /** Competencies the text points to that are not part of the family's profile. */
  outside: string[];
}

/** Reads the lines of a job description and proposes tasks with the levels they need in 2030. */
export function analyseJobDescription(text: string, title: string, content: Content, family: Family): Analysis {
  const lines = text
    .split(/\r?\n|;|(?<=[.!?])\s+/)
    .map((line) => line.replace(/^[\s\-–•*·\d.)]+/, "").trim())
    .filter((line) => line.length >= 12);
  const maxLevel = content.levels.length;
  const outside = new Set<string>();
  const tasks: TaskChange[] = [];
  let skipped = 0;

  for (const line of lines) {
    const lower = line.toLowerCase();
    const level = OWNS.some((word) => lower.includes(word)) ? Math.min(3, maxLevel) : SUPPORTS.some((word) => lower.includes(word)) ? 1 : 2;
    const needs: Record<string, number> = {};
    for (const signal of SIGNALS) {
      if (!signal.words.some((word) => lower.includes(word))) continue;
      if ((family.profile[signal.competency]?.target ?? 0) > 0) needs[signal.competency] = level;
      else outside.add(signal.competency);
    }
    if (Object.keys(needs).length === 0) {
      skipped++;
      continue;
    }
    tasks.push({
      id: `U${tasks.length + 1}-${line.length}-${lower.charCodeAt(0)}`,
      task: line.length > 70 ? `${line.slice(0, 67).trimEnd()}…` : line,
      today: "",
      future: line,
      change: AI.test(line) ? "augmented" : "stable",
      needsToday: {},
      needs2030: needs,
      source: title,
    });
  }
  return { tasks, skipped, outside: [...outside] };
}

/** One invented job description per family, so the upload can be tried without a file. */
export const SAMPLE_JOB_DESCRIPTIONS: Record<string, { title: string; text: string }> = {
  A: {
    title: "Senior Data Engineer (invented example)",
    text: [
      "Senior Data Engineer, digital unit",
      "- Design and operate data pipelines across IT and plant systems",
      "- Responsible for data quality standards and access rules for AI use cases",
      "- Develop AI agents with the business units and support their rollout",
      "- Review generated code and define the checks for it",
      "- Identify new use cases and learn new tools early",
    ].join("\n"),
  },
  B: {
    title: "Senior Controller (invented example)",
    text: [
      "Senior Controller, group controlling",
      "- Prepare the monthly reporting and explain deviations to the management",
      "- Responsible for the review and sign-off of AI-drafted reports",
      "- Develop and roll out automated report templates for the controlling teams",
      "- Identify process steps that can be optimised with AI assistants",
      "- Handle contract and personal data in line with data protection rules",
      "- Support colleagues in learning new tools",
    ].join("\n"),
  },
  D: {
    title: "Senior Maintenance Engineer, hydropower (invented example)",
    text: [
      "Senior Maintenance Engineer, hydropower",
      "- Plan and carry out condition-based maintenance for turbines and generators",
      "- Responsible for the review and sign-off of AI-supported fault diagnoses",
      "- Define data quality standards for inspection and sensor data across the plants",
      "- Identify use cases where predictive maintenance improves availability",
      "- Develop and roll out automated maintenance reports with the digital unit",
      "- Train the team in new tools and coordinate the troubleshooting of complex faults",
    ].join("\n"),
  },
  M: {
    title: "Head of Asset Management (invented example)",
    text: [
      "Head of Asset Management",
      "- Define the strategy and priorities for AI use in asset management",
      "- Lead the change towards AI-supported maintenance and coach the team leads",
      "- Responsible for decisions based on AI-supported reports and their review",
      "- Identify use cases across the plants and decide on the budget for them",
      "- Develop the unit's data standards with the digital unit",
    ].join("\n"),
  },
};

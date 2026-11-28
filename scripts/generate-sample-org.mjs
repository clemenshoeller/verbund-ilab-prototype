// Generates src/data/org.json: a fictitious organisation for the demo.
// SYNTHETIC DATA. Names, units, roles and ratings are invented; the same seed gives the same file.
// Run with: npm run sample-data
import { readFileSync, writeFileSync } from "node:fs";

const content = JSON.parse(readFileSync(new URL("../src/data/content.json", import.meta.url), "utf8"));
const families = Object.fromEntries(content.families.map((f) => [f.id, f]));

// Small seeded random generator (mulberry32) so the output is reproducible.
let state = 20261116;
function rand() {
  state |= 0;
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (list) => list[Math.floor(rand() * list.length)];

// A second, independent generator for the general competencies added on 28.11.2026,
// so that the ratings of the six AI competencies stay exactly as they were.
let state2 = 20261128;
function rand2() {
  state2 |= 0;
  state2 = (state2 + 0x6d2b79f5) | 0;
  let t = Math.imul(state2 ^ (state2 >>> 15), 1 | state2);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick2 = (list) => list[Math.floor(rand2() * list.length)];
const general = new Set(content.competencies.filter((c) => c.group === "general").map((c) => c.id));
const clamp = (value) => Math.max(0, Math.min(3, value));

// The demo manager's own team, written by hand so the walkthrough stays stable.
const demoTeam = { id: "t1", name: "Digital Projects", manager: "Elisabeth Brunner" };
const demoEmployees = [
  { id: "e1", name: "Anna Berger", role: "Data Engineer", family: "A" },
  { id: "e2", name: "Markus Leitner", role: "IT Application Manager", family: "A" },
  { id: "e3", name: "Julia Steiner", role: "Controller", family: "B" },
  { id: "e4", name: "Thomas Gruber", role: "Procurement Specialist", family: "B" },
  { id: "e5", name: "Stefan Huber", role: "Maintenance Technician", family: "D" },
  { id: "e6", name: "Katharina Moser", role: "Electrical Engineer", family: "D" },
  { id: "e7", name: "Michael Bauer", role: "Team Lead Operations", family: "M" },
].map((e) => ({ ...e, team: "t1" }));
const r = (self, manager, agreed, note = "") => ({ self, manager, agreed, note });
const demoAssessments = {
  e1: {
    status: "completed",
    date: "2026-11-03",
    focus: ["safe-use"],
    ratings: {
      "safe-use": r(3, 2, 2, "Knows the rules well, not yet the contact for others."),
      "check-results": r(3, 3, 3),
      "spot-potential": r(2, 2, 2),
      "build-scale": r(2, 3, 3, "Built the checks for the data pipeline."),
      "data-work": r(3, 3, 3),
      "adapt-learn": r(2, 2, 2),
      "process-solve": r(2, 2, 2),
    },
  },
  e3: {
    status: "completed",
    date: "2026-11-05",
    focus: ["check-results", "spot-potential"],
    ratings: {
      "safe-use": r(2, 2, 2),
      "check-results": r(2, 1, 1, "Checks figures, but not yet text output."),
      "spot-potential": r(1, 1, 1),
      "build-scale": r(0, 0, 0),
      "data-work": r(2, 2, 2),
      "adapt-learn": r(1, 1, 1),
      "process-solve": r(1, 1, 1),
    },
  },
  e5: {
    status: "completed",
    date: "2026-11-10",
    ratings: {
      "safe-use": r(1, 1, 1),
      "check-results": r(1, 2, 2, "Very careful with results from the maintenance tool."),
      "spot-potential": r(0, 1, 1),
      "build-scale": r(0, 0, 0),
      "data-work": r(1, 1, 1),
      "adapt-learn": r(1, 1, 1),
      "process-solve": r(2, 3, 3, "Finds faults that others miss."),
    },
  },
  // Markus has done the self-check, the conversation has not started.
  e2: {
    status: "open",
    date: null,
    ratings: {
      "safe-use": { ...r(3, null, null), selfTask: "A supplier sent logs with customer numbers for a bug analysis. I did not paste them into the assistant, removed the numbers with a script first and then used the released tool. I put the script into our team wiki, two colleagues use it now." },
      "check-results": { ...r(2, null, null), selfTask: "The assistant wrote a migration script for the application database. I read it line by line, ran it on a copy first and compared the row counts. It had dropped an index, which I added again before the release." },
      "spot-potential": { ...r(2, null, null), selfTask: "Release notes take me about two hours per release. An assistant could draft them from the tickets; it would need read access to the ticket system. Risk: it invents changes, so I would still check them against the tickets." },
      "build-scale": { ...r(2, null, null), selfTask: "I built a prompt template for incident summaries and adjusted it until the format fitted our reports. The three people in the on-call rotation use it." },
      "data-work": r(2, null, null),
      "adapt-learn": r(2, null, null),
      "process-solve": r(3, null, null),
    },
  },
  e7: {
    status: "in-progress",
    date: "2026-11-12",
    ratings: {
      "safe-use": r(2, 2, 2),
      "check-results": r(2, 2, 2),
      "spot-potential": r(2, null, null),
    },
  },
};

// Other teams: main job family, roles, share of completed conversations, skill bias in levels.
const teamPlans = [
  { name: "Data & Analytics", family: "A", size: 9, coverage: 0.9, bias: 0.35, roles: ["Data Analyst", "Data Engineer", "Data Scientist", "BI Developer"] },
  { name: "IT Applications", family: "A", size: 11, coverage: 0.7, bias: 0.1, roles: ["Application Manager", "Software Developer", "System Administrator", "IT Security Specialist"] },
  { name: "Finance & Controlling", family: "B", size: 10, coverage: 0.8, bias: 0.0, roles: ["Controller", "Accountant", "Financial Analyst"] },
  { name: "Procurement & Legal", family: "B", size: 8, coverage: 0.5, bias: -0.15, roles: ["Procurement Specialist", "Contract Manager", "Legal Counsel"] },
  { name: "HR Services", family: "B", size: 8, coverage: 1.0, bias: 0.15, roles: ["HR Business Partner", "Recruiter", "Payroll Specialist"] },
  { name: "Plant Engineering", family: "D", size: 11, coverage: 0.65, bias: 0.05, roles: ["Electrical Engineer", "Mechanical Engineer", "Project Engineer", "Civil Engineer"] },
  { name: "Maintenance", family: "D", size: 12, coverage: 0.35, bias: -0.35, roles: ["Maintenance Technician", "Electrician", "Service Technician"] },
  { name: "Grid Services", family: "D", size: 9, coverage: 0.75, bias: -0.05, roles: ["Grid Planner", "Protection Engineer", "Field Technician"] },
];

const firstNames = ["Alexander", "Andrea", "Barbara", "Bernhard", "Christina", "Daniel", "David", "Eva", "Florian", "Georg", "Hannah", "Jakob", "Johanna", "Karin", "Lukas", "Magdalena", "Manuel", "Maria", "Martin", "Nina", "Patrick", "Paul", "Petra", "Sabine", "Sarah", "Simon", "Tobias", "Verena", "Viktoria", "Wolfgang"];
const lastNames = ["Aigner", "Auer", "Baumann", "Binder", "Brandl", "Ebner", "Eder", "Egger", "Fischer", "Haas", "Hahn", "Hofer", "Kaiser", "Kern", "Koller", "Lang", "Lechner", "Lindner", "Maier", "Mayr", "Pichler", "Posch", "Reiter", "Riedl", "Schmid", "Schwarz", "Seidl", "Stadler", "Strobl", "Thaler", "Unger", "Vogl", "Wallner", "Weber", "Wimmer", "Winkler", "Wolf", "Zach"];
const usedNames = new Set(demoEmployees.map((e) => e.name));
function newName() {
  for (;;) {
    const name = `${pick(firstNames)} ${pick(lastNames)}`;
    if (!usedNames.has(name)) {
      usedNames.add(name);
      return name;
    }
  }
}

function rate(familyId, bias) {
  const ratings = {};
  for (const [competencyId, entry] of Object.entries(families[familyId].profile)) {
    // General competencies draw from the second generator (see above).
    const [r1, p1] = general.has(competencyId) ? [rand2, pick2] : [rand, pick];
    const noise = (r1() + r1() + r1() - 1.5) * 1.2;
    const agreed = clamp(Math.round(entry.baseline + bias + noise));
    ratings[competencyId] = {
      self: clamp(agreed + p1([0, 0, 0, 1, -1])),
      manager: clamp(agreed + p1([0, 0, 0, 0, 1, -1])),
      agreed,
      note: "",
    };
  }
  return ratings;
}

const teams = [demoTeam];
const employees = [...demoEmployees];
const assessments = { ...demoAssessments };
// Measures agreed after the conversation. e5 has none yet, so the demo shows an open next step.
const assignments = {
  e1: [{ measureId: "m1", status: "running", date: "2026-11-04" }],
  e3: [
    { measureId: "m2", status: "planned", date: "2026-11-06" },
    { measureId: "m3", status: "planned", date: "2026-11-06" },
  ],
};

const perPerson = new Set(content.measureTypes.filter((t) => t.perPerson).map((t) => t.id));

/** One or two measures that address the largest gaps of a rated person. */
function assign(familyId, ratings, date) {
  // Sample measures address the AI competencies only, as before the general competencies were added.
  const gaps = Object.entries(families[familyId].profile)
    .filter(([competencyId]) => !general.has(competencyId))
    .map(([competencyId, entry]) => ({ competencyId, gap: entry.target - (ratings[competencyId]?.agreed ?? entry.target) }))
    .filter((g) => g.gap > 0)
    .sort((a, b) => b.gap - a.gap);
  const chosen = [];
  for (const g of gaps.slice(0, 1 + Math.floor(rand() * 2))) {
    const options = content.measures.filter((m) => perPerson.has(m.type) && m.competencies.includes(g.competencyId) && !chosen.some((c) => c.measureId === m.id));
    if (options.length) chosen.push({ measureId: pick(options).id, status: pick(["planned", "planned", "running", "running", "done"]), date });
  }
  return chosen;
}
let nextId = demoEmployees.length + 1;

teamPlans.forEach((plan, index) => {
  const teamId = `t${index + 2}`;
  const lead = newName();
  teams.push({ id: teamId, name: plan.name, manager: lead });
  for (let i = 0; i < plan.size; i++) {
    const isLead = i === 0;
    const isDeputy = i === 1 && plan.size >= 10;
    const family = isLead || isDeputy ? "M" : plan.family;
    const role = isLead ? `Team Lead ${plan.name}` : isDeputy ? `Deputy Team Lead ${plan.name}` : pick(plan.roles);
    const id = `e${nextId++}`;
    employees.push({ id, name: isLead ? lead : newName(), role, family, team: teamId });

    const dice = rand();
    if (dice < plan.coverage) {
      const day = 1 + Math.floor(rand() * 44); // 1 Oct to 13 Nov 2026
      const date = day <= 31 ? `2026-10-${String(day).padStart(2, "0")}` : `2026-11-${String(day - 31).padStart(2, "0")}`;
      assessments[id] = { status: "completed", date, ratings: rate(family, plan.bias) };
      if (rand() < 0.55) {
        const chosen = assign(family, assessments[id].ratings, date);
        if (chosen.length) assignments[id] = chosen;
      }
    } else if (dice < plan.coverage + (1 - plan.coverage) * 0.3) {
      const all = Object.entries(rate(family, plan.bias)).filter(([competencyId]) => !general.has(competencyId));
      assessments[id] = { status: "in-progress", date: "2026-11-13", ratings: Object.fromEntries(all.slice(0, 2)) };
    }
  }
});

const org = {
  _note: "SYNTHETIC DATA generated by scripts/generate-sample-org.mjs. All persons, units, roles and ratings are invented.",
  currentTeamId: "t1",
  currentEmployeeId: "e6",
  hrUser: { name: "Martina Koch", role: "Personnel development" },
  // Role profiles of the demo team: three are assigned, the others can be assigned in the manager view.
  roles: { e1: "role-data-engineer", e3: "role-controller", e5: "role-maintenance" },
  teams,
  employees,
  assessments,
  assignments,
};
writeFileSync(new URL("../src/data/org.json", import.meta.url), JSON.stringify(org, null, 2) + "\n");
const done = Object.values(assessments).filter((a) => a.status === "completed").length;
console.log(`${teams.length} teams, ${employees.length} employees, ${done} completed conversations, ${Object.keys(assignments).length} with measures`);

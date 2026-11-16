import { useEffect, useMemo, useState } from "react";
import { getContent, getOrg } from "./api/dataSource";
import { Search } from "./components/Search";
import { DataContext, useData, type Data } from "./data";
import { useRoute } from "./lib/router";
import { useStore } from "./lib/store";
import { nextActions } from "./lib/workflow";
import { About } from "./pages/About";
import { Profiles } from "./pages/Profiles";
import { Start } from "./pages/Start";
import { CompetencyList, CompetencyRecord } from "./pages/hr/Competencies";
import { HrGapAnalysis } from "./pages/hr/GapAnalysis";
import { HrHome } from "./pages/hr/Home";
import { HrGovernance, HrMeasures, HrRoadmap } from "./pages/hr/Plans";
import { TeamList, TeamRecord } from "./pages/hr/Teams";
import { MyData, MyProfile } from "./pages/me/Me";
import { SelfCheck } from "./pages/me/SelfCheck";
import { TeamHome } from "./pages/team/Home";
import { People } from "./pages/team/People";
import { Person } from "./pages/team/Person";
import { Pipeline } from "./pages/team/Pipeline";
import type { Content, Org } from "./types";

export type View = "me" | "team" | "hr";

/** PROVISIONAL: the role is switched by hand. A real tool would derive it from the login. */
const ROLES: { id: View; label: string; hint: string }[] = [
  { id: "me", label: "Employee", hint: "What an employee sees: the own profile" },
  { id: "team", label: "Manager", hint: "What a manager sees: the own team" },
  { id: "hr", label: "HR", hint: "What HR sees: the whole organisation, as totals" },
];

interface NavItem {
  key: string;
  label: string;
  badge?: number;
}

export function App() {
  const [data, setData] = useState<{ content: Content; org: Org } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    Promise.all([getContent(), getOrg()])
      .then(([content, org]) => setData({ content, org }))
      .catch(() => setFailed(true));
  }, []);

  if (failed) return <p className="state">The data could not be loaded. Please reload the page.</p>;
  if (!data) return <p className="state">Loading…</p>;
  return <Root content={data.content} org={data.org} />;
}

function Root({ content, org }: { content: Content; org: Org }) {
  const seed = useMemo(() => ({ assessments: org.assessments, assignments: org.assignments }), [org]);
  const store = useStore(seed);
  const team = useMemo(() => {
    const info = org.teams.find((t) => t.id === org.currentTeamId) ?? org.teams[0];
    return { info, employees: org.employees.filter((e) => e.team === info.id) };
  }, [org]);
  const data: Data = { ...store, content, org, team };
  return (
    <DataContext.Provider value={data}>
      <Shell />
    </DataContext.Provider>
  );
}

function Shell() {
  const { content, org, team, assessments, assignments, reset } = useData();
  const route = useRoute();
  const view: View | null = route[0] === "me" || route[0] === "team" || route[0] === "hr" ? route[0] : null;
  const [page = "", id, tab, step] = view ? route.slice(1) : route;
  const me = org.employees.find((e) => e.id === org.currentEmployeeId) ?? org.employees[0];
  const open = nextActions(content, team.employees, assessments, assignments).length;
  const user = view === "me" ? { name: me.name, sub: me.role } : view === "hr" ? { name: "Demo HR", sub: "Personnel development" } : { name: team.info.manager, sub: team.info.name };

  const groups: { title: string; items: NavItem[] }[] =
    view === "me"
      ? [
          {
            title: "My AI profile",
            items: [
              { key: "", label: "My profile" },
              { key: "check", label: "Self-check" },
              { key: "data", label: "My data" },
            ],
          },
        ]
      : view === "team"
        ? [
            {
              title: "My team",
              items: [
                { key: "", label: "Home", badge: open || undefined },
                { key: "pipeline", label: "Pipeline" },
                { key: "people", label: "People", badge: team.employees.length },
              ],
            },
            { title: "Reference", items: [{ key: "profiles", label: "Target profiles" }] },
          ]
        : view === "hr"
          ? [
              {
                title: "Steering",
                items: [
                  { key: "", label: "Home" },
                  { key: "gaps", label: "Gap analysis" },
                  { key: "teams", label: "Teams", badge: org.teams.length },
                ],
              },
              {
                title: "Competency model",
                items: [
                  { key: "profiles", label: "Job families", badge: content.families.length },
                  { key: "competencies", label: "Competencies", badge: content.competencies.length },
                  { key: "measures", label: "Measures", badge: content.measures.length },
                ],
              },
              {
                title: "Plan",
                items: [
                  { key: "roadmap", label: "Roadmap" },
                  { key: "governance", label: "Governance" },
                ],
              },
            ]
          : [];

  return (
    <div className="app">
      <aside className="side">
        <a className="brand" href="#/" aria-label="AI Competency Check, start">
          <span className="wordmark">VERBUND</span>
          <span className="product">AI Competency Check</span>
        </a>
        <nav aria-label="Main">
          <div className="nav-group">
            <a href="#/" className={!view && page === "" ? "on" : ""}>
              Start
            </a>
          </div>
          {groups.map((group) => (
            <div key={group.title} className="nav-group">
              <span className="nav-title">{group.title}</span>
              {group.items.map((item) => (
                <a key={item.key} href={`#/${view}${item.key ? "/" + item.key : ""}`} className={page === item.key ? "on" : ""} aria-current={page === item.key ? "page" : undefined}>
                  {item.label}
                  {item.badge !== undefined && <span className="badge">{item.badge}</span>}
                </a>
              ))}
            </div>
          ))}
          {!view && (
            <div className="nav-group">
              <span className="nav-title">Open as</span>
              {ROLES.map((role) => (
                <a key={role.id} href={`#/${role.id}`} title={role.hint}>
                  {role.label}
                </a>
              ))}
            </div>
          )}
        </nav>
        <div className="side-foot">
          <a href="#/about" className={!view && page === "about" ? "on" : ""}>
            Data model and status
          </a>
          <button type="button" onClick={reset}>
            Reset demo data
          </button>
          <p>Student prototype. All persons, units and ratings are fictitious.</p>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          {view === "team" || view === "hr" ? <Search key={view} view={view} /> : <span className="search" />}
          <div className="switch" role="group" aria-label="Role (provisional switch)">
            {ROLES.map((role) => (
              <a key={role.id} href={`#/${role.id}`} className={view === role.id ? "on" : ""} aria-current={view === role.id ? "true" : undefined} title={role.hint}>
                {role.label}
              </a>
            ))}
          </div>
          {view && (
            <div className="user" title="Provisional: no login in the prototype">
              <span className="avatar small">
                {user.name
                  .split(" ")
                  .map((p) => p[0])
                  .join("")}
              </span>
              <span>
                <strong>{user.name}</strong>
                <span className="sub">{user.sub}</span>
              </span>
            </div>
          )}
        </header>
        <div className="notice">Prototype · invented data · development only, no pay or appraisal use · not approved for productive use</div>

        <main>
          {!view ? (
            page === "about" ? (
              <About />
            ) : (
              <Start />
            )
          ) : view === "me" ? (
            page === "check" ? (
              <SelfCheck step={id} />
            ) : page === "data" ? (
              <MyData />
            ) : (
              <MyProfile />
            )
          ) : page === "profiles" ? (
            <Profiles familyId={id} base={`/${view}`} />
          ) : view === "team" ? (
            page === "people" && id ? (
              <Person employeeId={id} tab={tab} step={step} />
            ) : page === "people" ? (
              <People />
            ) : page === "pipeline" ? (
              <Pipeline />
            ) : (
              <TeamHome />
            )
          ) : page === "gaps" ? (
            <HrGapAnalysis horizonId={id} />
          ) : page === "teams" && id ? (
            <TeamRecord teamId={id} />
          ) : page === "teams" ? (
            <TeamList />
          ) : page === "competencies" && id ? (
            <CompetencyRecord competencyId={id} />
          ) : page === "competencies" ? (
            <CompetencyList />
          ) : page === "measures" ? (
            <HrMeasures typeId={id} />
          ) : page === "roadmap" ? (
            <HrRoadmap />
          ) : page === "governance" ? (
            <HrGovernance />
          ) : (
            <HrHome />
          )}
        </main>
      </div>
    </div>
  );
}

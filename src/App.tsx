import { useEffect, useMemo, useState } from "react";
import { getContent, getOrg } from "./api/dataSource";
import { Search } from "./components/Search";
import { DataContext, useData, type Data } from "./data";
import { useRoute } from "./lib/router";
import { useStore } from "./lib/store";
import { nextActions } from "./lib/workflow";
import { About } from "./pages/About";
import { Profiles } from "./pages/Profiles";
import { CompetencyList, CompetencyRecord } from "./pages/hr/Competencies";
import { HrGapAnalysis } from "./pages/hr/GapAnalysis";
import { HrHome } from "./pages/hr/Home";
import { HrGovernance, HrMeasures, HrRoadmap } from "./pages/hr/Plans";
import { TeamList, TeamRecord } from "./pages/hr/Teams";
import { TeamHome } from "./pages/team/Home";
import { People } from "./pages/team/People";
import { Person } from "./pages/team/Person";
import { Pipeline } from "./pages/team/Pipeline";
import type { Content, Org } from "./types";

export type View = "team" | "hr";

/** PROVISIONAL: the view is switched by hand. A real tool would derive it from the login. */
const VIEWS: { id: View; label: string; hint: string; user: string; role: string }[] = [
  { id: "team", label: "Manager", hint: "What a manager sees: the own team", user: "Demo Manager", role: "Team lead" },
  { id: "hr", label: "HR", hint: "What HR sees: the whole organisation, aggregated", user: "Demo HR", role: "Personnel development" },
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
  const view: View = route[0] === "hr" ? "hr" : "team";
  const [page = "", id, tab] = route[0] === "hr" || route[0] === "team" ? route.slice(1) : route;
  const current = VIEWS.find((v) => v.id === view)!;
  const open = nextActions(content, team.employees, assessments, assignments).length;

  const groups: { title: string; items: NavItem[] }[] =
    view === "team"
      ? [
          {
            title: "My work",
            items: [
              { key: "", label: "Home", badge: open || undefined },
              { key: "pipeline", label: "Pipeline" },
              { key: "people", label: "People", badge: team.employees.length },
            ],
          },
          { title: "Reference", items: [{ key: "profiles", label: "Target profiles" }] },
        ]
      : [
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
        ];

  return (
    <div className="app">
      <aside className="side">
        <a className="brand" href={`#/${view}`} aria-label="AI Competency Check, home">
          <span className="wordmark">VERBUND</span>
          <span className="product">AI Competency Check</span>
        </a>
        <nav aria-label="Main">
          {groups.map((group) => (
            <div key={group.title} className="nav-group">
              <span className="nav-title">{group.title}</span>
              {group.items.map((item) => (
                <a
                  key={item.key}
                  href={`#/${view}${item.key ? "/" + item.key : ""}`}
                  className={page === item.key ? "on" : ""}
                  aria-current={page === item.key ? "page" : undefined}
                >
                  {item.label}
                  {item.badge !== undefined && <span className="badge">{item.badge}</span>}
                </a>
              ))}
            </div>
          ))}
        </nav>
        <div className="side-foot">
          <a href={`#/${view}/about`} className={page === "about" ? "on" : ""}>
            About this prototype
          </a>
          <button type="button" onClick={reset}>
            Reset demo data
          </button>
          <p>Student prototype. All persons, units and ratings are fictitious.</p>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <Search key={view} view={view} />
          <div className="switch" role="group" aria-label="View (provisional switch)">
            {VIEWS.map((v) => (
              <a key={v.id} href={`#/${v.id}`} className={view === v.id ? "on" : ""} aria-current={view === v.id ? "true" : undefined} title={v.hint}>
                {v.label}
              </a>
            ))}
          </div>
          <div className="user" title="Provisional: no login in the prototype">
            <span className="avatar small">{current.user.split(" ").map((p) => p[0]).join("")}</span>
            <span>
              <strong>{current.user}</strong>
              <span className="sub">{view === "team" ? team.info.name : current.role}</span>
            </span>
          </div>
        </header>
        <div className="notice">Prototype · synthetic data only · not approved for productive use</div>

        <main>
          {page === "about" ? (
            <About />
          ) : page === "profiles" ? (
            <Profiles familyId={id} base={`/${view}`} />
          ) : view === "team" ? (
            page === "people" && id ? (
              <Person employeeId={id} tab={tab} />
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

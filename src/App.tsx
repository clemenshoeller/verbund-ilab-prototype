import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { getContent, getOrg } from "./api/dataSource";
import { Drawer } from "./components/Drawer";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Icon } from "./components/Icon";
import { Search } from "./components/Search";
import { SectionContext, type Section } from "./components/Ui";
import { ViewAs, type View } from "./components/ViewAs";
import { DataContext, useData, type Data } from "./data";
import { withRoles, withUploads } from "./lib/jobprofile";
import { takeStay, useRoute } from "./lib/router";
import { useStore } from "./lib/store";
import { nextActions } from "./lib/workflow";
import { About } from "./pages/About";
import { Profiles } from "./pages/Profiles";
import { Start } from "./pages/Start";
import { CompetencyList, CompetencyRecord } from "./pages/hr/Competencies";
import { HrGapAnalysis } from "./pages/hr/GapAnalysis";
import { HrHome } from "./pages/hr/Home";
import { HrPersonas, HrTasks } from "./pages/hr/JobChange";
import { HrGovernance, HrMeasures, HrRoadmap } from "./pages/hr/Plans";
import { TeamList, TeamRecord } from "./pages/hr/Teams";
import { HrRoles, HrSkills } from "./pages/hr/Units";
import { HrUpload } from "./pages/hr/Upload";
import { MyData, MyProfile } from "./pages/me/Me";
import { SelfCheck } from "./pages/me/SelfCheck";
import { TeamHome } from "./pages/team/Home";
import { People } from "./pages/team/People";
import { Person } from "./pages/team/Person";
import { Pipeline } from "./pages/team/Pipeline";
import type { Content, Org } from "./types";
import { Toasts, UiProvider } from "./ui";

interface NavItem {
  key: string;
  label: string;
  icon: string;
  badge?: number;
  /** Further pages that belong to this item, shown as tabs or as another view; the item stays marked on them. */
  also?: string[];
}

const isView = (value?: string): value is View => value === "me" || value === "team" || value === "hr";

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
  return (
    <ErrorBoundary scope="app">
      <Root content={data.content} org={data.org} />
    </ErrorBoundary>
  );
}

function Root({ content, org }: { content: Content; org: Org }) {
  const seed = useMemo(() => ({ assessments: org.assessments, assignments: org.assignments, roles: org.roles ?? {} }), [org]);
  const store = useStore(seed);
  const team = useMemo(() => {
    const info = org.teams.find((t) => t.id === org.currentTeamId) ?? org.teams[0];
    return { info, employees: org.employees.filter((e) => e.team === info.id) };
  }, [org]);
  // Tasks from uploaded job descriptions are part of the model from the moment HR applies them.
  // Role profiles (those of the content and those HR added) give the people they are assigned to a profile of their own.
  const model = useMemo(() => {
    const base = withUploads(content, store.uploads);
    const roleProfiles = [...(content.roleProfiles ?? []), ...store.customRoles];
    return withRoles({ ...base, roleProfiles }, org.employees, store.roles, roleProfiles);
  }, [content, org, store.uploads, store.roles, store.customRoles]);
  const data: Data = { ...store, content: model, org, team };
  return (
    <DataContext.Provider value={data}>
      <UiProvider>
        <Shell />
      </UiProvider>
    </DataContext.Provider>
  );
}

function Shell() {
  const { content, org, team, assessments, assignments } = useData();
  const route = useRoute();
  // Pages outside a role (guide, data model) keep the navigation of the role last used.
  const last = useRef<View>("team");
  if (isView(route[0])) last.current = route[0];
  const view = last.current;
  const inRole = isView(route[0]);
  const [page = "", id, tab, step] = inRole ? route.slice(1) : [];
  // Outside a role: the start page (also reached as "guide") or the data model.
  const extra = inRole ? "" : route[0] === "about" ? "about" : "start";
  const open = nextActions(content, team.employees, assessments, assignments).length;

  // After moving to another page the heading takes the focus, so keyboard and screen-reader users land on the new content.
  const hash = window.location.hash;
  const firstPage = useRef(true);
  // biome-ignore lint/correctness/useExhaustiveDependencies: the address is the trigger, the effect reads the page that was rendered for it
  useLayoutEffect(() => {
    if (firstPage.current) {
      firstPage.current = false;
      return;
    }
    // A switch between views of the same page (tabs of a card) keeps the place on the page and the focus on the chosen tab.
    const stay = takeStay();
    if (stay) {
      const page = document.querySelector<HTMLElement>("main");
      if (page) page.style.animation = "none";
      try {
        window.scrollTo(0, stay.y);
      } catch {
        // Not available in every environment (tests).
      }
      const list = [...document.querySelectorAll<HTMLElement>('main [role="tablist"]')].find((l) => l.getAttribute("aria-label") === stay.tablist);
      list?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus({ preventScroll: true });
      return;
    }
    try {
      window.scrollTo(0, 0);
    } catch {
      // Not available in every environment (tests); the page still changes.
    }
    document.querySelector<HTMLElement>("main h1")?.focus({ preventScroll: true });
  }, [hash]);

  const groups: { title: string; items: NavItem[] }[] =
    view === "me"
      ? [
          {
            title: "My AI profile",
            items: [
              { key: "", label: "My profile", icon: "person" },
              { key: "check", label: "Self-check", icon: "checklist" },
              { key: "data", label: "My data", icon: "lock" },
            ],
          },
        ]
      : view === "team"
        ? [
            {
              title: "My team",
              items: [
                { key: "", label: "Dashboard", icon: "home", badge: open || undefined },
                { key: "people", label: "Team", icon: "people", badge: team.employees.length, also: ["pipeline"] },
              ],
            },
            { title: "Reference", items: [{ key: "profiles", label: "Target profiles", icon: "target" }] },
          ]
        : [
            {
              title: "Steering",
              items: [
                { key: "", label: "Dashboard", icon: "home" },
                { key: "gaps", label: "Gap analysis", icon: "chart", also: ["tasks", "personas"] },
                { key: "teams", label: "Teams", icon: "team", badge: org.teams.length, also: ["skills", "roles"] },
              ],
            },
            {
              title: "Model and plan",
              items: [
                { key: "profiles", label: "Competency model", icon: "layers", also: ["competencies", "measures", "upload"] },
                { key: "roadmap", label: "Plan", icon: "map", also: ["governance"] },
              ],
            },
          ];

  // HR pages that share one menu item appear as tabs under the page title.
  const sections: Section[] =
    view === "hr"
      ? [
          {
            label: "Gap analysis",
            active: page,
            tabs: [
              { id: "gaps", label: "Competency gaps", href: "#/hr/gaps" },
              { id: "tasks", label: "Changing tasks", href: "#/hr/tasks" },
              { id: "personas", label: "Personas", href: "#/hr/personas" },
            ],
          },
          {
            label: "Teams",
            active: page,
            tabs: [
              { id: "teams", label: "Teams", href: "#/hr/teams", count: org.teams.length },
              { id: "skills", label: "Skills by unit", href: "#/hr/skills" },
              { id: "roles", label: "Roles", href: "#/hr/roles" },
            ],
          },
          {
            label: "Competency model",
            active: page,
            tabs: [
              { id: "profiles", label: "Job families", href: "#/hr/profiles", count: content.families.length },
              { id: "competencies", label: "Competencies", href: "#/hr/competencies", count: content.competencies.length },
              { id: "measures", label: "Measures", href: "#/hr/measures", count: content.measures.length },
              { id: "upload", label: "Role profiles", href: "#/hr/upload", count: content.roleProfiles?.length },
            ],
          },
          {
            label: "Plan",
            active: page,
            tabs: [
              { id: "roadmap", label: "Roadmap", href: "#/hr/roadmap" },
              { id: "governance", label: "Governance", href: "#/hr/governance" },
            ],
          },
        ]
      : [];
  const section = inRole ? (sections.find((s) => s.tabs.some((t) => t.id === page)) ?? null) : null;

  return (
    <div className="app">
      <button type="button" className="skip" onClick={() => document.querySelector<HTMLElement>("main h1")?.focus()}>
        Skip to the content
      </button>
      <aside className="side">
        <a className="brand" href="#/" aria-label="AI Competency Check, start page">
          <span className="wordmark">VERBUND</span>
          <span className="product">AI Competency Check</span>
        </a>
        <nav aria-label="Main">
          {groups.map((group) => (
            <div key={group.title} className="nav-group">
              <span className="nav-title">{group.title}</span>
              {group.items.map((item) => {
                const active = inRole && (page === item.key || (item.also?.includes(page) ?? false));
                return (
                  <a key={item.key} href={`#/${view}${item.key ? "/" + item.key : ""}`} className={active ? "on" : ""} aria-current={active ? "page" : undefined}>
                    <Icon name={item.icon} />
                    <span>{item.label}</span>
                    {item.badge !== undefined && <span className="badge">{item.badge}</span>}
                  </a>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="side-foot">
          <a href="#/" className={extra === "start" ? "on" : ""}>
            <Icon name="info" />
            <span>Start page</span>
          </a>
          <a href="#/about" className={extra === "about" ? "on" : ""}>
            <Icon name="database" />
            <span>Data model and status</span>
          </a>
          <p>
            <span className="pill">Prototype</span> Invented data. Development only, no pay or appraisal use.
          </p>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          {view === "me" ? <span className="search" /> : <Search key={view} view={view} />}
          <ViewAs view={view} />
        </header>

        <main key={window.location.hash}>
          <ErrorBoundary scope="page">
          <SectionContext.Provider value={section}>
          {extra === "start" ? (
            <Start />
          ) : extra === "about" ? (
            <About />
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
          ) : page === "tasks" ? (
            <HrTasks familyId={id} />
          ) : page === "personas" ? (
            <HrPersonas familyId={id} />
          ) : page === "skills" ? (
            <HrSkills horizonId={id} />
          ) : page === "roles" ? (
            <HrRoles familyId={id} />
          ) : page === "upload" ? (
            <HrUpload familyId={id} />
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
          </SectionContext.Provider>
          </ErrorBoundary>
        </main>
      </div>

      <Drawer />
      <Toasts />
    </div>
  );
}

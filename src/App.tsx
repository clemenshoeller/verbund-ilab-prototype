import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { getContent, getOrg } from "./api/dataSource";
import { Drawer } from "./components/Drawer";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Icon } from "./components/Icon";
import { Search } from "./components/Search";
import { ViewAs, type View } from "./components/ViewAs";
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
import { Toasts, UiProvider } from "./ui";

interface NavItem {
  key: string;
  label: string;
  icon: string;
  badge?: number;
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
  const seed = useMemo(() => ({ assessments: org.assessments, assignments: org.assignments }), [org]);
  const store = useStore(seed);
  const team = useMemo(() => {
    const info = org.teams.find((t) => t.id === org.currentTeamId) ?? org.teams[0];
    return { info, employees: org.employees.filter((e) => e.team === info.id) };
  }, [org]);
  const data: Data = { ...store, content, org, team };
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
    try {
      window.scrollTo(0, 0);
    } catch {
      // Not available in every environment (tests); the page still changes.
    }
    document.querySelector<HTMLElement>("main h1")?.focus({ preventScroll: true });
  }, [hash]);

  // The browser tab names the page that is open. Runs after every render, so it also follows data changes.
  useEffect(() => {
    // Only the words of the heading: no initials, sub-line or draft mark.
    const h1 = document.querySelector("main h1")?.cloneNode(true) as HTMLElement | undefined;
    for (const node of h1?.querySelectorAll(".avatar, .record-sub, .draft") ?? []) node.remove();
    const heading = h1?.textContent?.trim();
    document.title = heading ? `${heading} · AI Competency Check` : "AI Competency Check";
  });

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
                { key: "pipeline", label: "Pipeline", icon: "board" },
                { key: "people", label: "People", icon: "people", badge: team.employees.length },
              ],
            },
            { title: "Reference", items: [{ key: "profiles", label: "Target profiles", icon: "target" }] },
          ]
        : [
            {
              title: "Steering",
              items: [
                { key: "", label: "Dashboard", icon: "home" },
                { key: "gaps", label: "Gap analysis", icon: "chart" },
                { key: "teams", label: "Teams", icon: "team", badge: org.teams.length },
              ],
            },
            {
              title: "Competency model",
              items: [
                { key: "profiles", label: "Job families", icon: "grid", badge: content.families.length },
                { key: "competencies", label: "Competencies", icon: "layers", badge: content.competencies.length },
                { key: "measures", label: "Measures", icon: "measure", badge: content.measures.length },
              ],
            },
            {
              title: "Plan",
              items: [
                { key: "roadmap", label: "Roadmap", icon: "map" },
                { key: "governance", label: "Governance", icon: "scale" },
              ],
            },
          ];

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
                const active = inRole && page === item.key;
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
          </ErrorBoundary>
        </main>
      </div>

      <Drawer />
      <Toasts />
    </div>
  );
}

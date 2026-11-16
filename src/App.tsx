import { useEffect, useMemo, useState } from "react";
import { getContent, getOrg } from "./api/dataSource";
import { useRoute } from "./lib/router";
import { useAssessments } from "./lib/store";
import { Assessment } from "./pages/Assessment";
import { Gaps } from "./pages/Gaps";
import { Overview } from "./pages/Overview";
import { Profiles } from "./pages/Profiles";
import { HrDashboard } from "./pages/hr/Dashboard";
import { HrGapAnalysis } from "./pages/hr/GapAnalysis";
import { HrGovernance, HrMeasures, HrRoadmap } from "./pages/hr/Plans";
import type { Content, Org } from "./types";

type View = "team" | "hr";

/** PROVISIONAL: the view is switched by hand. A real tool would derive it from the login. */
const VIEWS: { id: View; label: string; hint: string }[] = [
  { id: "team", label: "Team view", hint: "What a manager sees: the own team" },
  { id: "hr", label: "HR view", hint: "What HR sees: the whole organisation, aggregated" },
];

const NAV: Record<View, { key: string; label: string }[]> = {
  team: [
    { key: "", label: "Overview" },
    { key: "profiles", label: "Target profiles" },
    { key: "assess", label: "Conversation" },
    { key: "gaps", label: "Gaps" },
  ],
  hr: [
    { key: "", label: "Dashboard" },
    { key: "profiles", label: "Target profiles" },
    { key: "gaps", label: "Gap analysis" },
    { key: "measures", label: "Measures" },
    { key: "roadmap", label: "Roadmap" },
    { key: "governance", label: "Governance" },
  ],
};

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
  return <Shell content={data.content} org={data.org} />;
}

function Shell({ content, org }: { content: Content; org: Org }) {
  const route = useRoute();
  const view: View = route[0] === "hr" ? "hr" : "team";
  // "#/team/gaps/e3" and the older "#/gaps/e3" both work.
  const [page = "", id] = route[0] === "hr" || route[0] === "team" ? route.slice(1) : route;
  const { assessments, setRating, complete, reset } = useAssessments(org.assessments);

  const team = useMemo(() => {
    const info = org.teams.find((t) => t.id === org.currentTeamId) ?? org.teams[0];
    return { info, employees: org.employees.filter((e) => e.team === info.id) };
  }, [org]);

  return (
    <>
      <div className="notice">Prototype · synthetic data only · not approved for productive use</div>
      <header className="top">
        <a className="brand" href={`#/${view}`} aria-label="AI Competency Check, start page">
          <span className="wordmark">VERBUND</span>
          <span className="product">AI Competency Check</span>
        </a>
        <div className="switch" role="group" aria-label="View (provisional switch)">
          {VIEWS.map((v) => (
            <a key={v.id} href={`#/${v.id}`} className={view === v.id ? "on" : ""} aria-current={view === v.id ? "true" : undefined} title={v.hint}>
              {v.label}
            </a>
          ))}
        </div>
      </header>
      <nav className="mainnav" aria-label="Main">
        <div>
          {NAV[view].map((item) => (
            <a
              key={item.key}
              href={`#/${view}${item.key ? "/" + item.key : ""}`}
              className={page === item.key ? "on" : ""}
              aria-current={page === item.key ? "page" : undefined}
            >
              {item.label}
            </a>
          ))}
          <span className="scope">
            {view === "team" ? `${team.info.name} · ${team.info.manager}` : `Whole organisation · ${org.teams.length} teams`}
          </span>
        </div>
      </nav>

      <main>
        {page === "profiles" ? (
          <Profiles content={content} familyId={id} base={`/${view}`} />
        ) : view === "team" ? (
          page === "assess" ? (
            <Assessment content={content} employees={team.employees} assessments={assessments} employeeId={id} setRating={setRating} complete={complete} />
          ) : page === "gaps" ? (
            <Gaps content={content} employees={team.employees} assessments={assessments} employeeId={id} />
          ) : (
            <Overview content={content} team={team.info} employees={team.employees} assessments={assessments} />
          )
        ) : page === "gaps" ? (
          <HrGapAnalysis content={content} org={org} assessments={assessments} horizonId={id} />
        ) : page === "measures" ? (
          <HrMeasures content={content} org={org} assessments={assessments} />
        ) : page === "roadmap" ? (
          <HrRoadmap content={content} />
        ) : page === "governance" ? (
          <HrGovernance content={content} />
        ) : (
          <HrDashboard content={content} org={org} assessments={assessments} />
        )}
      </main>

      <footer className="foot">
        <span>
          WU Industry Lab × VERBUND · student prototype · all persons, units and ratings are fictitious · placeholder
          content
        </span>
        <button type="button" className="btn ghost small" onClick={reset}>
          Reset demo data
        </button>
      </footer>
    </>
  );
}

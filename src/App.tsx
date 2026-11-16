import { useEffect, useState } from "react";
import { getContent, getTeam } from "./api/dataSource";
import { useRoute } from "./lib/router";
import { useAssessments } from "./lib/store";
import { Assessment } from "./pages/Assessment";
import { Gaps } from "./pages/Gaps";
import { Overview } from "./pages/Overview";
import { Profiles } from "./pages/Profiles";
import type { Content, Team } from "./types";

const NAV = [
  { key: "", label: "Overview", href: "#/" },
  { key: "profiles", label: "Target profiles", href: "#/profiles" },
  { key: "assess", label: "Conversation", href: "#/assess" },
  { key: "gaps", label: "Gaps", href: "#/gaps" },
];

export function App() {
  const [data, setData] = useState<{ content: Content; team: Team } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    Promise.all([getContent(), getTeam()])
      .then(([content, team]) => setData({ content, team }))
      .catch(() => setFailed(true));
  }, []);

  if (failed) return <p className="state">The data could not be loaded. Please reload the page.</p>;
  if (!data) return <p className="state">Loading…</p>;
  return <Shell content={data.content} team={data.team} />;
}

function Shell({ content, team }: { content: Content; team: Team }) {
  const [page = "", id] = useRoute();
  const { assessments, setRating, complete, reset } = useAssessments(team.assessments);

  return (
    <>
      <div className="notice">Prototype · synthetic data only · not approved for productive use</div>
      <header className="top">
        <a className="brand" href="#/" aria-label="AI Competency Check, overview">
          <span className="wordmark">VERBUND</span>
          <span className="product">AI Competency Check</span>
        </a>
        <nav aria-label="Main">
          {NAV.map((item) => (
            <a key={item.key} href={item.href} className={page === item.key ? "on" : ""} aria-current={page === item.key ? "page" : undefined}>
              {item.label}
            </a>
          ))}
        </nav>
      </header>

      <main>
        {page === "profiles" ? (
          <Profiles content={content} familyId={id} />
        ) : page === "assess" ? (
          <Assessment content={content} team={team} assessments={assessments} employeeId={id} setRating={setRating} complete={complete} />
        ) : page === "gaps" ? (
          <Gaps content={content} team={team} assessments={assessments} employeeId={id} />
        ) : (
          <Overview content={content} team={team} assessments={assessments} />
        )}
      </main>

      <footer className="foot">
        <span>
          WU Industry Lab × VERBUND · student prototype · all persons, roles and ratings are fictitious · placeholder
          content
        </span>
        <button type="button" className="btn ghost small" onClick={reset}>
          Reset demo data
        </button>
      </footer>
    </>
  );
}

import { LevelBar } from "../components/Level";
import { go } from "../lib/router";
import { profileCompetencies } from "../lib/gap";
import type { Content } from "../types";

export function Profiles({ content, familyId, base }: { content: Content; familyId?: string; base: string }) {
  const family = content.families.find((f) => f.id === familyId) ?? content.families[0];
  const competencies = profileCompetencies(content, family);

  return (
    <>
      <div className="page-head">
        <p className="eyebrow">{base === "/hr" ? "HR view · future target state" : "Step 1"}</p>
        <h1>Target profiles</h1>
        <p className="lead">The level each job family needs today and in 2030, on a scale of three levels.</p>
      </div>

      <div className="tabs" role="tablist" aria-label="Job family">
        {content.families.map((f) => (
          <button
            key={f.id}
            role="tab"
            type="button"
            aria-selected={f.id === family.id}
            className={"tab" + (f.id === family.id ? " on" : "")}
            onClick={() => go(`${base}/profiles/${f.id}`)}
          >
            {f.name}
          </button>
        ))}
      </div>

      <section className="panel">
        <h2>{family.name}</h2>
        <p>{family.summary}</p>
        <p className="muted">{family.example}</p>
      </section>

      {content.groups.map((group) => {
        const inGroup = competencies.filter((c) => c.group === group.id);
        if (inGroup.length === 0) return null;
        return (
          <section key={group.id}>
            <h3 className="group-title">{group.name}</h3>
            <div className="table-wrap">
              <table className="table profile">
                <thead>
                  <tr>
                    <th>Competency</th>
                    <th>Today</th>
                    <th>Target 2030</th>
                    <th>What the 2030 level means</th>
                  </tr>
                </thead>
                <tbody>
                  {inGroup.map((c) => {
                    const entry = family.profile[c.id];
                    return (
                      <tr key={c.id}>
                        <td>
                          <strong>{c.name}</strong>
                          <span className="sub">{c.description}</span>
                        </td>
                        <td>
                          <LevelBar value={entry.baseline} />
                          <span className="sub">{levelName(content, entry.baseline)}</span>
                        </td>
                        <td>
                          <LevelBar value={entry.target} />
                          <span className="sub">{levelName(content, entry.target)}</span>
                        </td>
                        <td>{c.levels[entry.target - 1]}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      <section className="legend">
        {content.levels.map((level) => (
          <span key={level.value}>
            <LevelBar value={level.value} /> <strong>{level.name}</strong> {level.short}
          </span>
        ))}
      </section>
    </>
  );
}

function levelName(content: Content, value: number): string {
  return content.levels.find((l) => l.value === value)?.name ?? "Not required yet";
}

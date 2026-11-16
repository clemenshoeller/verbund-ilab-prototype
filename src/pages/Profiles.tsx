import { LevelBar } from "../components/Level";
import { Card, PageHead } from "../components/Ui";
import { useData } from "../data";
import { profileCompetencies } from "../lib/gap";
import { go } from "../lib/router";
import type { Content } from "../types";

/** Target profile per job family. Shown in both views; HR reaches it as "Job families". */
export function Profiles({ familyId, base }: { familyId?: string; base: string }) {
  const { content, org } = useData();
  const family = content.families.find((f) => f.id === familyId) ?? content.families[0];
  const competencies = profileCompetencies(content, family);
  const hr = base === "/hr";
  const headcount = org.employees.filter((e) => e.family === family.id).length;

  return (
    <>
      <PageHead title={hr ? "Job families" : "Target profiles"} sub="The level each job family needs today and in 2030, on a scale of three levels." />

      <div className="tabs" role="tablist" aria-label="Job family">
        {content.families.map((f) => (
          <button key={f.id} role="tab" type="button" aria-selected={f.id === family.id} className={"tab" + (f.id === family.id ? " on" : "")} onClick={() => go(`${base}/profiles/${f.id}`)}>
            {f.name}
          </button>
        ))}
      </div>

      <Card title={family.name} aside={hr ? `${headcount} employees` : undefined}>
        <p>{family.summary}</p>
        <p className="muted">{family.example}</p>
      </Card>

      {content.groups.map((group) => {
        const inGroup = competencies.filter((c) => c.group === group.id);
        if (inGroup.length === 0) return null;
        return (
          <Card key={group.id} title={group.name} flush>
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
                          {hr ? (
                            <a href={`#/hr/competencies/${c.id}`}>
                              <strong>{c.name}</strong>
                            </a>
                          ) : (
                            <strong>{c.name}</strong>
                          )}
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
          </Card>
        );
      })}

      <p className="legend">
        {content.levels.map((level) => (
          <span key={level.value}>
            <LevelBar value={level.value} /> <strong>{level.name}</strong> {level.short}
          </span>
        ))}
      </p>
    </>
  );
}

function levelName(content: Content, value: number): string {
  return content.levels.find((l) => l.value === value)?.name ?? "Not required yet";
}

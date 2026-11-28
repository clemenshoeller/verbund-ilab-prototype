import { useEffect, useRef, useState } from "react";
import { DraftTag } from "../../components/Figures";
import { LevelBar } from "../../components/Level";
import { Card, PageHead } from "../../components/Ui";
import { useData } from "../../data";
import { SAMPLE_JOB_DESCRIPTIONS, analyseJobDescription, profileChanges, type Analysis } from "../../lib/jobprofile";
import { switchTo } from "../../lib/router";
import { useUi } from "../../ui";

/**
 * HR uploads a job description; the tool reads the tasks from it and adapts the job profile.
 * MOCKED: keyword rules stand in for a language model (see lib/jobprofile.ts). A person reviews
 * every proposal before it is applied.
 */
export function HrUpload({ familyId }: { familyId?: string }) {
  const { content, uploads, addUpload, clearUploads } = useData();
  const { toast } = useUi();
  const family = content.families.find((f) => f.id === familyId) ?? content.families[0];
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const applied = uploads[family.id] ?? [];
  const name = (id: string) => content.competencies.find((c) => c.id === id)?.name ?? id;
  const changes = analysis ? profileChanges(family, analysis.tasks, content.levels.length) : [];
  // The result appears below the form: bring it into view, so nobody has to look for it.
  const result = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (analysis) result.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }, [analysis]);

  const edit = (next: { title?: string; text?: string }) => {
    if (next.title !== undefined) setTitle(next.title);
    if (next.text !== undefined) setText(next.text);
    setAnalysis(null);
  };

  const readFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => edit({ title: file.name.replace(/\.[^.]+$/, ""), text: String(reader.result ?? "").slice(0, 6000) });
    reader.readAsText(file);
  };

  return (
    <>
      <PageHead
        title={
          <>
            Upload a job description <DraftTag>Mocked</DraftTag>
          </>
        }
        sub="The tool reads the tasks from a job description, proposes the levels they need in 2030 and adapts the target profile of the job family once you apply it."
      />

      <div className="tabs" role="tablist" aria-label="Job family">
        {content.families.map((f) => (
          <button
            key={f.id}
            role="tab"
            type="button"
            aria-selected={f.id === family.id}
            className={"tab" + (f.id === family.id ? " on" : "")}
            onClick={() => {
              setAnalysis(null);
              switchTo(`/hr/upload/${f.id}`);
            }}
          >
            {f.name}
          </button>
        ))}
      </div>

      <Card title="1. The job description" aside={`for ${family.name}`}>
        <div className="form">
          <label>
            <span>Title</span>
            <input type="text" value={title} maxLength={120} placeholder="For example: Senior Controller" onChange={(event) => edit({ title: event.target.value })} />
          </label>
          <label>
            <span>Text, one task per line. English or German.</span>
            <textarea rows={8} maxLength={6000} value={text} placeholder="Paste the tasks of the job description here" onChange={(event) => edit({ text: event.target.value })} />
          </label>
          <label>
            <span>Or choose a text file (.txt). Word and PDF files are not read in the prototype.</span>
            <input type="file" accept=".txt,text/plain" onChange={(event) => readFile(event.target.files?.[0])} />
          </label>
        </div>
        <div className="finish between">
          <button type="button" className="btn ghost" onClick={() => edit(SAMPLE_JOB_DESCRIPTIONS[family.id] ?? SAMPLE_JOB_DESCRIPTIONS.B)}>
            Use an example
          </button>
          <button type="button" className="btn" disabled={text.trim().length < 12} onClick={() => setAnalysis(analyseJobDescription(text, title.trim() || "Job description", content, family))}>
            Read the tasks
          </button>
        </div>
      </Card>

      {analysis && (
        <div className="stack result" ref={result}>
          <Card title="2. What the text asks for" aside={`${analysis.tasks.length} tasks found`} flush>
            {analysis.tasks.length === 0 ? (
              <p className="empty">No line pointed to a competency of this job family. Try a text with one task per line.</p>
            ) : (
              <div className="table-wrap">
                <table className="table tasks">
                  <thead>
                    <tr>
                      <th>Task in the job description</th>
                      <th>Needs in 2030</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.tasks.map((task) => (
                      <tr key={task.id}>
                        <td>{task.future}</td>
                        <td>
                          <ul className="needs">
                            {Object.entries(task.needs2030).map(([id, level]) => (
                              <li key={id}>
                                {name(id)} <span className="lvl">{level}</span>
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="muted small card-note">
              {analysis.skipped > 0 && `${analysis.skipped} ${analysis.skipped === 1 ? "line" : "lines"} without a clear competency left out. `}
              {analysis.outside.length > 0 && `Also mentioned, but not part of this family’s profile: ${analysis.outside.map(name).join(", ")}. Adding a competency stays with the owner of the model. `}
              Level 1 = supports the task, 2 = does it, 3 = is responsible for it across the unit.
            </p>
          </Card>

          {analysis.tasks.length > 0 && (
            <Card title="3. What changes in the target profile" aside={changes.length === 0 ? "No change" : `${changes.length} ${changes.length === 1 ? "target" : "targets"} raised`} flush>
              {changes.length === 0 ? (
                <p className="empty">The profile of {family.name} already covers this job description. The tasks are added, the targets stay.</p>
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Competency</th>
                        <th>2030 target now</th>
                        <th>2030 target after the upload</th>
                      </tr>
                    </thead>
                    <tbody>
                      {changes.map((change) => (
                        <tr key={change.competencyId}>
                          <td>
                            <strong>{name(change.competencyId)}</strong>
                          </td>
                          <td>
                            <LevelBar value={change.from} />
                          </td>
                          <td>
                            <LevelBar value={change.to} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="finish card-note">
                <span className="muted small">Applies to everyone in {family.name}: gaps, key figures and recommended measures follow at once.</span>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    addUpload(family.id, analysis.tasks);
                    toast(`Profile of ${family.name} updated`);
                    setAnalysis(null);
                    setText("");
                    setTitle("");
                  }}
                >
                  Apply to the job profile
                </button>
              </div>
            </Card>
          )}
        </div>
      )}

      <Card title="Applied uploads" aside={<a href={`#/hr/tasks/${family.id}`}>Tasks of {family.name}</a>}>
        {applied.length === 0 ? (
          <p className="muted">No job description has been applied to {family.name} yet.</p>
        ) : (
          <div className="finish between">
            <span>
              {applied.length} {applied.length === 1 ? "task" : "tasks"} from {new Set(applied.map((task) => task.source)).size === 1 ? "one job description" : "several job descriptions"} are part of the profile.
            </span>
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                clearUploads(family.id);
                toast("Uploaded tasks removed");
              }}
            >
              Remove them
            </button>
          </div>
        )}
      </Card>

      <p className="muted small">
        Mocked: keyword rules in the browser stand in for a language model, and nothing leaves this browser. A real tool would read Word and PDF files, propose the tasks
        with a language model approved by VERBUND, and keep the review by a person before anything is applied.
      </p>
    </>
  );
}

import { Card, PageHead } from "../components/Ui";
import { useData } from "../data";

/** What is behind the screens: the records, where they come from now, and what a real system would need. */
const ENTITIES = [
  { name: "Competency", fields: "name, group, description, why it matters, question, three level descriptions, example per job family", now: "content.json", later: "Maintained by the owner of the competency model" },
  { name: "Case", fields: "competency, job families, situation, four answers with the level each shows, minutes", now: "content.json", later: "Written and tested with employees; reviewed with the works council" },
  { name: "Written task", fields: "competency, job families, task, questions to write about, what to look for per level, minutes", now: "content.json", later: "Written and tested with employees and managers" },
  { name: "Job family", fields: "name, summary, tasks, target profile, personas", now: "content.json", later: "Maintained by HR; link to the job architecture" },
  { name: "Task", fields: "job family, task today, task in 2030, kind of change, level needed per competency today and in 2030", now: "content.json; uploads in the browser", later: "From job descriptions and the yearly review" },
  { name: "Target profile entry", fields: "job family, competency, level today, level 2030", now: "content.json, checked against the tasks by a test", later: "Calculated from the tasks; reviewed once a year (see Governance)" },
  { name: "Persona", fields: "job family, name, role, story, level per competency", now: "content.json", later: "Replaced by real conversations" },
  { name: "Team", fields: "name, manager", now: "org.json (generated)", later: "From the HR master data" },
  { name: "Employee", fields: "name, role, job family, team", now: "org.json (generated)", later: "From the HR master data; no manual upkeep" },
  { name: "Assessment", fields: "employee, status, date, focus areas", now: "org.json, changes in the browser", later: "Stored in a database, one per person and year" },
  { name: "Rating", fields: "assessment, competency, answers to the cases, self-check level, text of the written task, manager, agreed, note", now: "org.json, changes in the browser", later: "Stored in a database; access limited to employee and manager" },
  { name: "Measure", fields: "title, type, description, competencies it builds, job families, course links", now: "content.json", later: "Linked to the learning offer" },
  { name: "Assignment", fields: "employee, measure, status, date", now: "org.json, changes in the browser", later: "Stored in a database; status from the learning system" },
];

const STATE = [
  { part: "Records, lists, filters, search, pipeline, key figures", state: "Works", note: "Calculated live from the ratings" },
  { part: "Competency conversation and agreeing measures", state: "Works", note: "Saved in this browser only" },
  { part: "Self-check with cases and written tasks, own result, focus areas, development plan", state: "Works", note: "Saved in this browser only; the level follows from the cases by a fixed rule, the written tasks are read by the manager" },
  { part: "Tasks today and in 2030, target profiles that follow from them, path to 2030", state: "Works", note: "Calculated; the tasks are a draft from the team’s research" },
  { part: "Skills by unit, roles, personas", state: "Works", note: "On simulated data" },
  { part: "Course links in measures", state: "Works", note: "Links to public examples; VERBUND’s own catalogue entries are assumed" },
  { part: "Upload of a job description", state: "Mocked", note: "Keyword rules stand in for a language model; text files only" },
  { part: "Switch between employee, manager and HR", state: "Provisional", note: "By hand; a real tool derives it from the login" },
  { part: "Login, roles, access control", state: "Not built", note: "The rule “HR sees no persons” is only a display rule here" },
  { part: "Backend and database", state: "Mocked", note: "Two JSON files stand in for an interface" },
  { part: "AI competencies with definitions and behaviour anchors", state: "VERBUND", note: "From “Kompetenzmodell goes AI”, translated; use approved" },
  { part: "General competencies, cases, tasks, profiles, personas, measures, roadmap, governance", state: "Draft", note: "By the student team from interviews and desk research, to be replaced by the project results" },
  { part: "Employees, teams, ratings", state: "Simulated", note: "Invented and generated with a fixed seed; no finding about VERBUND" },
];

export function About() {
  const { content, org } = useData();
  return (
    <>
      <PageHead
        crumbs={[{ label: "Start", href: "#/" }, { label: "Data model and status" }]}
        title="Data model and status"
        sub="What works in the prototype, what is mocked, and which records a real system would need."
      />

      <Card title="What works and what is mocked" flush>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Part</th>
                <th>State</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {STATE.map((row) => (
                <tr key={row.part}>
                  <td>
                    <strong>{row.part}</strong>
                  </td>
                  <td>
                    <span className="kind">{row.state}</span>
                  </td>
                  <td>{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card
        title="Data model"
        aside={`${content.competencies.length} competencies · ${content.families.length} job families · ${org.teams.length} teams · ${org.employees.length} employees`}
        flush
      >
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Record</th>
                <th>Fields</th>
                <th>In the prototype</th>
                <th>In a real system</th>
              </tr>
            </thead>
            <tbody>
              {ENTITIES.map((entity) => (
                <tr key={entity.name}>
                  <td>
                    <strong>{entity.name}</strong>
                  </td>
                  <td>{entity.fields}</td>
                  <td>{entity.now}</td>
                  <td>{entity.later}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small card-note">
          Productive use would need VERBUND’s Technology-Demand process: data protection, information security, architecture review and an agreement
          with the works council on recording competencies.
        </p>
      </Card>
    </>
  );
}

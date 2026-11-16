import { Card, PageHead } from "../components/Ui";
import { useData } from "../data";

/** What is behind the screens: the records, where they come from now, and what a real system would need. */
const ENTITIES = [
  { name: "Competency", fields: "name, group, description, question, three level descriptions", now: "content.json", later: "Maintained by the owner of the competency model" },
  { name: "Job family", fields: "name, summary, target profile", now: "content.json", later: "Maintained by HR; link to the job architecture" },
  { name: "Target profile entry", fields: "job family, competency, level today, level 2030", now: "content.json", later: "Reviewed once a year (see Governance)" },
  { name: "Team", fields: "name, manager", now: "org.json (generated)", later: "From the HR master data" },
  { name: "Employee", fields: "name, role, job family, team", now: "org.json (generated)", later: "From the HR master data; no manual upkeep" },
  { name: "Assessment", fields: "employee, status, date", now: "org.json, changes in the browser", later: "Stored in a database, one per person and year" },
  { name: "Rating", fields: "assessment, competency, self, manager, agreed, note", now: "org.json, changes in the browser", later: "Stored in a database; access limited to employee and manager" },
  { name: "Measure", fields: "title, type, description, competencies it builds", now: "content.json", later: "Linked to the learning offer" },
  { name: "Assignment", fields: "employee, measure, status, date", now: "org.json, changes in the browser", later: "Stored in a database; status from the learning system" },
];

const STATE = [
  { part: "Records, lists, filters, search, pipeline, key figures", state: "Works", note: "Calculated live from the ratings" },
  { part: "Competency conversation and agreeing measures", state: "Works", note: "Saved in this browser only" },
  { part: "Switch between manager and HR", state: "Provisional", note: "By hand; a real tool derives it from the login" },
  { part: "Login, roles, access control", state: "Not built", note: "The rule “HR sees no persons” is only a display rule here" },
  { part: "Backend and database", state: "Mocked", note: "Two JSON files stand in for an interface" },
  { part: "Competencies, profiles, measures, roadmap, governance", state: "Placeholder", note: "Wording by the student team, to be replaced by the project results" },
  { part: "Employees, teams, ratings", state: "Synthetic", note: "Invented and generated with a fixed seed" },
];

export function About() {
  const { content, org } = useData();
  return (
    <>
      <PageHead
        title="About this prototype"
        sub="A clickable concept from the WU Industry Lab project with VERBUND. It shows how AI competencies could be collected, analysed and managed, on invented data."
      />

      <div className="grid-1-1">
        <Card title="For managers">
          <p>
            One place for the yearly competency conversation: the target profile of the job family, a guided talk with self-rating,
            manager rating and an agreed level, the gaps, and the measures agreed for each person.
          </p>
        </Card>
        <Card title="For HR and the digital unit">
          <p>
            The same data, aggregated: where the organisation stands against today’s level and the 2030 target, which gaps come first,
            which measures are in use, and how the competency model is kept up to date.
          </p>
        </Card>
      </div>

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

import { Avatar } from "../components/Ui";
import { useData } from "../data";

/** Entry page: who uses the tool, the one journey to follow in a demo, and why it is built this way. */
const PRINCIPLES = [
  {
    title: "A conversation, not a survey",
    text: "Self-ratings alone are lenient and agree little with a manager’s view. They get better when the levels are described and when people know the rating will be discussed. So the self-check is only the preparation; the level is agreed in a talk.",
    source: "Meta-analyses on self-assessment and self-other agreement; Deloitte 2026: self-report plus manager conversation",
  },
  {
    title: "Development only",
    text: "Ratings that feed pay or appraisal come out about a third of a standard deviation more lenient than ratings for development. The tool says what the data is for and who sees it, before anyone answers.",
    source: "Meta-analysis of rating purpose (22 studies); CIPD evidence review on performance management",
  },
  {
    title: "Few competencies, described in behaviour",
    text: "Six competencies, three described levels, an example per job family. Studies of skills programmes advise a small critical set over long lists. Which rating format is best is not settled; describing levels in behaviour is the common ground.",
    source: "Deloitte 2026 on skills-based organisations; research on behaviour-based rating scales",
  },
  {
    title: "One sentence first, detail on demand",
    text: "Every page opens with what the data says. Figures come with what they are compared to. One level of overview, one level of detail.",
    source: "Nielsen Norman Group on progressive disclosure; UK Government Analysis Function on chart titles",
  },
  {
    title: "From gap to action in the same step",
    text: "The conversation ends with two focus areas at most and a measure for each. Established tools put the development goal right next to the gap and cap the number of goals.",
    source: "Development plans in Lattice, Culture Amp and ServiceNow; guidance of one to three goals",
  },
  {
    title: "Totals for HR, never persons",
    text: "HR sees job families and teams from five rated employees up. People agree on the levels, no AI rates anyone; as we read the EU AI Act, that keeps the tool outside the high-risk category for HR systems. Real use needs a works agreement.",
    source: "ArbVG § 96a; EU AI Act Annex III; usual minimum group size in employee surveys",
  },
];

export function Start() {
  const { content, org, team } = useData();
  const employee = org.employees.find((e) => e.id === org.currentEmployeeId)!;
  const first = employee.name.split(" ")[0];
  const count = Object.keys(content.families.find((f) => f.id === employee.family)!.profile).length;

  const journey = [
    { who: employee.name, role: "Employee", text: `${first} does the self-check: ${count} competencies, five minutes, before the yearly appraisal talk.`, href: "#/me", link: "Open as employee" },
    {
      who: team.info.manager,
      role: "Manager",
      text: `In the talk both go through one competency at a time and agree on a level, then on two focus areas and a measure.`,
      href: `#/team/people/${employee.id}/conversation`,
      link: "Open the conversation",
    },
    { who: "HR and the digital unit", role: "HR", text: "The agreed levels add up: who is fit for today, where the gaps to 2030 are, which measures are used.", href: "#/hr", link: "Open as HR" },
  ];

  return (
    <>
      <section className="hero">
        <p className="eyebrow">Tool concept · WU Industry Lab with VERBUND</p>
        <h1>One conversation per person a year shows where the company stands on AI.</h1>
        <p>
          The AI Competency Check adds twenty minutes to the yearly appraisal talk. Each employee and manager agree on AI competency levels against
          the target profile of the job family, and on what to do next. HR gets the picture for the whole company without seeing a single person.
        </p>
      </section>

      <section>
        <h2 className="section-title">Follow one person through it</h2>
        <ol className="journey">
          {journey.map((step, i) => (
            <li key={step.role}>
              <span className="journey-num">{i + 1}</span>
              <span className="journey-who">
                <Avatar name={step.who} small />
                <span>
                  <strong>{step.role}</strong>
                  <span className="sub">{step.who}</span>
                </span>
              </span>
              <p>{step.text}</p>
              <a className="btn ghost small" href={step.href}>
                {step.link}
              </a>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="section-title">Why it is built this way</h2>
        <div className="principles">
          {PRINCIPLES.map((p) => (
            <details key={p.title} className="principle">
              <summary>{p.title}</summary>
              <p>{p.text}</p>
              <p className="muted small">Based on: {p.source}</p>
            </details>
          ))}
        </div>
      </section>

      <p className="muted small">
        Prototype with invented persons and placeholder content. What works and what is mocked: <a href="#/about">data model and status</a>.
      </p>
    </>
  );
}

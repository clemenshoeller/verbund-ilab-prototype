import { Avatar, PageHead } from "../components/Ui";
import { useData } from "../data";
import { selfCheckItems, selfCheckMinutes } from "../lib/scoring";

/** Entry page: who uses the tool, the one journey to follow in a demo, and why it is built this way. */
const PRINCIPLES = [
  {
    title: "Cases first, then a conversation",
    text: "Self-ratings alone are lenient and agree little with a manager’s view. So the self-check asks what a person would do in concrete situations and lets them describe what they really did, instead of asking for a rating. The manager reads these answers, and the level is agreed in a talk. The self-check belongs to the employee and is shared only on purpose.",
    source: "Meta-analyses on self-assessment and self-other agreement; research on situational judgement tests; jour fixe with VERBUND, 24.11.2026",
  },
  {
    title: "Development only",
    text: "Ratings that feed pay or appraisal come out about a third of a standard deviation more lenient than ratings for development. The tool says what the data is for and who sees it, before anyone answers.",
    source: "Meta-analysis of rating purpose (22 studies); CIPD evidence review on performance management",
  },
  {
    title: "Few competencies, described in behaviour",
    text: "Six AI competencies and three general ones, three described levels, an example per job family. Studies of skills programmes advise a small critical set over long lists. Which rating format is best is not settled; describing levels in behaviour is the common ground.",
    source: "Deloitte 2026 on skills-based organisations; research on behaviour-based rating scales",
  },
  {
    title: "One sentence first, detail on demand",
    text: "Every page opens with what the data says. Figures come with what they are compared to. One level of overview, one level of detail.",
    source: "Nielsen Norman Group on progressive disclosure; UK Government Analysis Function on chart titles",
  },
  {
    title: "From the findings to the target, set in advance",
    text: "Interviews and desk research say how the tasks of a job family change until 2030. Each task needs competencies at a level; the target profile is the highest level any task asks for. So the 2030 state is fixed before anyone is assessed, and every yearly round shows how much of it is reached.",
    source: "The team’s interviews and desk research; jour fixe with VERBUND, 24.11.2026",
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
  const items = selfCheckItems(content, content.families.find((f) => f.id === employee.family)!);
  const written = items.filter((item) => item.kind === "task").length;

  const journey = [
    { who: employee.name, role: "Employee", text: `${first} does the self-check: ${items.length - written} cases and ${written} written tasks from the job, about ${selfCheckMinutes(items)} minutes. The result is ${first}’s own, with ideas and course links.`, href: "#/me", link: "View as employee" },
    {
      who: team.info.manager,
      role: "Manager",
      text: `In the talk both go through one competency at a time. The manager reads what ${first} wrote, says which level it shows, and both agree on one level, then on two focus areas and a measure.`,
      href: `#/team/people/${employee.id}/conversation`,
      link: "Open the conversation",
    },
    { who: org.hrUser.name, role: "HR", text: "The agreed levels add up in one dashboard: how tasks change, how much of the 2030 profile is reached, where the gaps are, which measures are used.", href: "#/hr", link: "View as HR" },
  ];

  return (
    <>
      <PageHead
        title="One conversation per person a year shows where the company stands on AI."
        sub="The AI Competency Check starts with a case-based self-check and adds twenty minutes to the yearly appraisal talk. Employee and manager agree on competency levels against the target profile of the job family, which follows from how its tasks change until 2030, and on what to do next. HR gets the picture for the whole company without seeing a single person."
      />

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
        Prototype with invented persons; all figures are simulated and no finding about VERBUND. What works and what is mocked: <a href="#/about">data model and status</a>.
      </p>
    </>
  );
}

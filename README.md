# AI Competency Check – prototype

Clickable tool concept for managers, built in the WU Industry Lab project "Closing the AI Talent Gap in the Energy Industry" with VERBUND (deliverable D5).

**Status: fourth version (16.11.2026), reworked after design research.** It shows what is feasible. Content is placeholder text, all data is synthetic. It is a prototype and not approved for productive use.

## What it demonstrates

One competency conversation per person and year, as a part of the yearly appraisal talk, and what the company learns from all of them. Three roles, switched by hand at the top right (provisional, there is no login). The start page walks through one person's journey and gives the reasons for the design.

**Employee**

| Page | What it does |
|---|---|
| My profile | The next step in one box; the target profile, later the agreed levels, focus and measures |
| Self-check | One competency per screen: pick the description that fits, add an example from the own work |
| My data | What is stored, who sees it, what it is used for |

**Manager**, works on the own team:

| Page | What it does |
|---|---|
| Home | A sentence on where the team stands, the next steps, the team at a glance |
| Pipeline | Board with four stages from "not started" to "measures agreed" |
| People | List with search, filters and sorting |
| Record of a person | Overview in words and as a level path; the guided conversation; activity |
| Conversation | Start, one competency per step with question, job example and a grid for employee, manager and agreed level; then two focus areas at most with a measure; then a summary |

**HR**, sees totals only, never single persons:

| Page | What it does |
|---|---|
| Home | Three questions with one figure each: fit for today, on the way to 2030, is it moving; fit by job family; what needs attention |
| Gap analysis | Heatmap for today's level or the 2030 target, prioritised list of gaps |
| Teams, Job families, Competencies, Measures | Lists with records |
| Roadmap, Governance | First drafts, marked as draft |

## Design principles

Each page opens with a sentence that states the result. Levels are described in behaviour with an example per job family. Detail opens on demand, one level deep. The check serves development only. The conversation ends in at most two focus areas and a measure. HR sees groups from five rated employees up. The sources behind these choices are on the start page and in the project's design research notes.

## Run it

Requires Node.js 22.12 or newer.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests
npm run build      # production build in dist/
```

With Docker (port 8080, runs without root, suitable for OpenShift):

```bash
docker build -t ai-competency-check .
docker run --rm -p 8080:8080 ai-competency-check
```

## Change the content (no coding needed)

All texts and numbers the user sees come from two files:

| File | Contains |
|---|---|
| `src/data/content.json` | Levels, competencies, questions, job families, target profiles, measures, roadmap, governance |
| `src/data/org.json` | Sample organisation: 9 teams, 85 employees, their ratings and agreed measures |

Edit `content.json`, save, and the running app updates. `org.json` is generated: change `scripts/generate-sample-org.mjs` and run `npm run sample-data` (same seed, same file). `npm test` checks that profiles and measures only point to existing competencies and levels.

## Functional and mocked

| Part | State |
|---|---|
| Navigation, lists, filters, search, records, pipeline, conversation, gap calculation | Functional |
| Agreeing measures for a person and setting their status | Functional, stored in the browser only |
| Key figures, heatmaps, prioritised gaps, reach of measures | Functional, calculated live from the ratings (`src/lib/metrics.ts`) |
| Self-check of the employee, focus areas, development plan | Functional, stored in the browser only |
| Switch between employee, manager and HR | **Provisional**: switched by hand; a real tool would derive it from the login |
| Roadmap and governance pages | **Draft** texts from `content.json`, a first proposal of the student team |
| Ratings entered in the conversation | Functional, stored in the browser only (`localStorage`); "Reset demo data" deletes them |
| Backend and database | **Mocked**: `src/api/dataSource.ts` returns the JSON files |
| Login and roles | **Not built**: one fixed demo manager; nothing prevents opening the other view |
| Competency model, profiles, levels, questions, measures | **Placeholder** worded by the student team. The grouping (base, future, leadership; six competencies) follows the structure the team presented in its jour fixe deck of 17.11.2026 |
| Employees, units and ratings | **Synthetic**, generated with a fixed seed; all persons are invented |
| VERBUND systems, accounts or data | **None used** |

## Architecture

```
src/
  api/dataSource.ts   the only place data is read (mock now, backend later)
  data/               content.json, org.json
  data.tsx            context that hands content, organisation and state to the pages
  lib/gap.ts          gaps of one person (tested)
  lib/metrics.ts      aggregated figures for both roles (tested)
  lib/workflow.ts     stages, next steps, use of measures (tested)
  lib/store.ts        ratings and agreed measures in the browser
  lib/router.ts       hash routing, needs no server rules
  pages/me/           employee: Me (profile, data), SelfCheck
  pages/team/         manager: Home, Pipeline, People, Person, Conversation
  pages/hr/           HR: Home, GapAnalysis, Teams, Competencies, Plans (measures, roadmap, governance)
  pages/              shared: Start, Profiles, About
  components/         search, cards, tabs, level path (Steps), competency line, meters, heatmap
scripts/
  generate-sample-org.mjs   builds data/org.json
```

Static single-page app: React 19, TypeScript, Vite. The container serves the built files with nginx.

### Deviation from the preferred stack

The guidelines prefer a .NET backend and PostgreSQL or SQL Server. This version has neither, because nothing is stored on a server yet. The frontend framework (React) is on the preferred list. A backend only has to serve the shapes in `src/types.ts` at `GET /content` and `GET /org`; set `VITE_DATA_SOURCE=api` and `VITE_API_BASE_URL`, and the pages stay unchanged. Saving ratings through the backend is not built.

## Configuration and secrets

There are no secrets. Settings are read from environment variables at build time; see `.env.example` (fictitious values). `.env` files are ignored by git.

## Data and security

- No real VERBUND data, credentials or interfaces. No personal data of real persons.
- No network requests in mock mode; ratings never leave the browser.
- Free-text notes are rendered as text (escaped by React) and limited to 300 characters.
- The HR role shows aggregates only, and its search finds no persons. Groups with fewer than five rated employees are hidden (`MIN_GROUP` in `src/lib/metrics.ts`). This is a rule in the display, not access control.
- The container runs as a non-root user.

## External services

| Service | Used for | Data |
|---|---|---|
| GitHub (private repository, GitHub Actions) | Source code, automated tests and container build | Source code and synthetic data |

No hosting, analytics or fonts from third parties.

## Use of AI

Code and placeholder content were written with Claude Code (Anthropic) on instructions of the student team. Inputs were the team's own project notes and the colours and fonts of VERBUND's company presentation; no VERBUND credentials, systems or data sets. Review so far: type check, unit tests, dependency audit and a manual click-through of all pages. A line-by-line code review by a developer has not taken place.

## Dependencies

| Package | Version | Licence | Use |
|---|---|---|---|
| react, react-dom | 19.3.1 | MIT | runtime |
| vite | 8.3.8 | MIT | build |
| @vitejs/plugin-react | 6.3.0 | MIT | build |
| typescript | 7.0.2 | Apache-2.0 | type check |
| vitest | 5.1.0 | MIT | tests |
| @types/react, @types/react-dom | 19.3.0 | MIT | type check |

Container images: `node:24-alpine` (build), `nginxinc/nginx-unprivileged:stable-alpine` (runtime). Exact versions of all packages are locked in `package-lock.json`.

## Tests

`npm test` runs 32 unit tests: gap logic and status in words, aggregated figures (share at target, missing levels, prioritisation, minimum group size), stages and next steps, and consistency checks of the content files. The CI workflow (`.github/workflows/ci.yml`) runs tests, build and `npm audit`, builds the container and requests the start page from it under an arbitrary non-root user.

Manual test: as employee do the self-check; as manager open that person's conversation, agree all levels, choose a focus and a measure, complete it; check that the employee's profile and the HR figures changed; reset the demo data.

## Known limitations

- No backend, no database, no login; data does not sync between devices or users.
- Content is not validated against VERBUND's competency model or the interview results. Roadmap, governance and measures are drafts.
- The sample ratings are random around today's level, so most employees are below the 2030 target; the figures show how the views work, not a finding.
- Gaps are prioritised by urgency and size only; strategic relevance is not weighted.
- No UI tests, no accessibility audit, English only.
- The look follows VERBUND's company presentation (blue, Georgia, Arial). No official logo or brand assets are included.

## Next steps

1. Replace the placeholder content with the target profiles and the assessment process from the interviews.
2. Clarify with VERBUND: backend expected or not, which internal content may be used, form of the handover.
3. If wanted: .NET API with PostgreSQL behind `dataSource.ts`, saving of ratings, login.

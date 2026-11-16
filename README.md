# AI Competency Check – prototype

Clickable prototype from the WU Industry Lab project "Closing the AI Talent Gap in the Energy Industry" with VERBUND (deliverable D5).

It shows one idea: **one competency conversation per person and year, as part of the yearly appraisal talk, and what the company learns from all of them.** An employee prepares with a self-check, manager and employee agree on a level per AI competency against the target profile of the job family, choose at most two focus areas and a measure, and HR sees the totals without seeing a single person.

> A prototype with invented data and placeholder content. Not approved for productive use (see [From prototype to productive use](#from-prototype-to-productive-use)).

## Contents

- [What it demonstrates](#what-it-demonstrates)
- [Run it](#run-it)
- [Functional, mocked, out of scope](#functional-mocked-out-of-scope)
- [Architecture](#architecture)
- [Configuration and secrets](#configuration-and-secrets)
- [Data and security](#data-and-security)
- [External services and AI](#external-services-and-ai)
- [Dependencies and licences](#dependencies-and-licences)
- [Tests](#tests)
- [Assumptions](#assumptions)
- [Known limitations](#known-limitations)
- [From prototype to productive use](#from-prototype-to-productive-use)
- [Handover checklist](#handover-checklist)

## What it demonstrates

Three roles, chosen in the "View as" menu at the top right. The switch is provisional; there is no login.

| Role | Pages | What they are for |
|---|---|---|
| Employee | My profile, Self-check, My data | Prepare the talk in five minutes; see the agreed levels and the plan; see what is stored and who sees it |
| Manager | Dashboard, Pipeline, People, record of a person with the guided conversation, Target profiles | Know what to do next; hold the conversation step by step; keep the development plan |
| HR | Dashboard, Gap analysis, Teams, Job families, Competencies, Measures, Roadmap, Governance | See where the organisation stands today and against 2030, where to act first, how the model is kept current |

The start page walks through one person's journey and gives the reasons for the design, with sources. "Data model and status" lists the records behind the screens.

Design principles: every page opens with a sentence that states the result; levels are described in behaviour with an example per job family; detail opens on demand; the check serves development only; HR sees groups from five rated employees up.

## Run it

Requires Node.js 22.12 or newer.

```bash
npm install
npm run dev        # http://localhost:5173 (next free port if taken)
npm test           # 45 tests
npm run build      # production build in dist/
```

With Docker. The container listens on port 8080 and runs without root:

```bash
docker build -t ai-competency-check .
docker run --rm -p 8080:8080 ai-competency-check
```

Then open http://localhost:8080. `GET /healthz` answers `ok`.

On OpenShift: `deploy/openshift.yaml` holds a Deployment, a Service and a Route. Push the image to a registry the cluster can reach, replace the image placeholder and apply the file. The manifests were checked for valid syntax only; they were not applied to a cluster.

### Change the content without coding

| File | Contains |
|---|---|
| `src/data/content.json` | Levels, competencies, questions, examples, job families, target profiles, measures, roadmap, governance |
| `src/data/org.json` | Sample organisation: 9 teams, 85 invented employees, their ratings and agreed measures |

Edit `content.json`, save, and the running app updates. `org.json` is generated: change `scripts/generate-sample-org.mjs` and run `npm run sample-data` (same seed, same file). `npm test` checks that profiles and measures only point to existing competencies and levels.

## Functional, mocked, out of scope

| Part | State |
|---|---|
| Navigation, search, lists with filters and sorting, records, preview panel, pipeline | Functional |
| Self-check, guided conversation, focus areas, measures with status | Functional; saved in the browser only (`localStorage`), deleted by "Reset demo data" |
| Key figures, trend, heatmap, prioritised gaps, use of measures | Functional; calculated from the ratings (`src/lib/metrics.ts`) |
| Switch between employee, manager and HR | **Provisional**: chosen by hand |
| Backend and database | **Mocked**: `src/api/dataSource.ts` returns two JSON files |
| Competencies, levels, questions, examples, target profiles, measures | **Placeholder** worded by the student team; the grouping follows the team's jour fixe deck of 17.11.2026 |
| Roadmap and governance | **Draft** texts, a first proposal of the student team |
| Employees, teams, ratings | **Synthetic**, generated with a fixed seed; all persons are invented |
| Login, roles, access control | **Out of scope** |
| Saving on a server, several users, correction of own data | **Out of scope** |
| Connection to HR systems, learning systems or any VERBUND system | **Out of scope** |
| German user interface, accessibility audit | **Out of scope** |

## Architecture

A static single-page app: React 19, TypeScript, Vite. In the container, nginx serves the built files. There is no server-side code.

```
src/
  api/dataSource.ts    the only place data is read (mock now, backend later)
  data/                content.json, org.json
  types.ts             the data model
  data.tsx, ui.tsx     shared state: content and ratings; confirmations and preview panel
  lib/gap.ts           gaps and status of one person
  lib/metrics.ts       totals, trend, heatmap, priorities
  lib/workflow.ts      stages, next steps, use of measures
  lib/store.ts         ratings and measures in the browser
  lib/router.ts        hash routing, needs no server rules
  pages/me/            employee: Me, SelfCheck
  pages/team/          manager: Home, Pipeline, People, Person, Conversation
  pages/hr/            HR: Home, GapAnalysis, Teams, Competencies, Plans
  pages/               Start, Profiles, About
  components/          search, View-as menu, preview drawer, KPI tile, level path, icons, ...
  styles.css           one stylesheet with the design tokens at the top
  app.test.tsx         click tests of the whole app
scripts/generate-sample-org.mjs   builds data/org.json
deploy/nginx.conf, deploy/openshift.yaml
Dockerfile, .github/workflows/ci.yml
```

Data model (details in `src/types.ts` and on the page "Data model and status"): Competency, Job family with its target profile, Team, Employee, Assessment with Ratings (self, manager, agreed, note) and focus areas, Measure, Assignment of a measure to a person.

### Deviation from the preferred stack

| Area | Preferred | Here | Reason and way back |
|---|---|---|---|
| Frontend | Blazor, Angular, React or Vue | React | On the list |
| Backend | .NET | None | Nothing is stored on a server; a clickable concept was asked for. A .NET API only has to serve the shapes in `src/types.ts` at `GET /content` and `GET /org`; set `VITE_DATA_SOURCE=api` and `VITE_API_BASE_URL` and the pages stay unchanged. Writing ratings back is not built |
| Database | PostgreSQL or Microsoft SQL Server | None; browser storage for the demo | The records map one to one to tables (one per record type above). Nothing has to be migrated, because the prototype holds only invented data |
| Deployment | OpenShift, at least Docker | Docker image for a non-root nginx, example OpenShift manifests | Image built and started as an arbitrary non-root user in CI; manifests not applied to a cluster |

## Configuration and secrets

There are no secrets in this project. Two settings exist, read at build time from environment variables; `.env.example` shows them with fictitious values, `.env` files are ignored by git.

| Variable | Default | Meaning |
|---|---|---|
| `VITE_DATA_SOURCE` | `mock` | `mock` reads the JSON files, `api` calls a backend |
| `VITE_API_BASE_URL` | empty | Base address of that backend |

Because Vite reads them at build time, changing them means building the image again. With a backend on another address, `connect-src` in `deploy/nginx.conf` has to allow it.

## Data and security

- No real VERBUND data, accounts, systems or interfaces. No personal data of real persons.
- In mock mode the app makes no network requests after loading; ratings never leave the browser.
- Free text is limited to 300 characters and shown as text (React escapes it). The code uses no `innerHTML`, no `eval` and writes nothing to the console.
- A page that fails shows a plain message without technical detail.
- The container runs without root and sends a Content-Security-Policy, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` and `Permissions-Policy`; the nginx version is not shown.
- The git history was searched for keys, tokens and passwords: none.
- `npm audit` reports no known vulnerabilities (checked on every push).
- "HR sees no persons" and "groups under five are hidden" are rules of the display. Without a login they are not access control.

## External services and AI

| Service | Used for | What goes there | Assessment |
|---|---|---|---|
| GitHub (private repository, GitHub Actions) | Source code, automated tests, container build | Source code and invented data | Access limited to the account owner. The repository can be exported at any time (`git clone`, ZIP) and deleted. Where GitHub processes and stores data, and its subprocessors, were not checked against the current terms |
| Claude Code (Anthropic) | Writing code, placeholder content and documentation | Instructions of the student team, the team's own project notes, colours and fonts of public VERBUND material | Externally hosted AI service. No VERBUND credentials, systems or data sets were entered. Whether the team's notes from talks with VERBUND may be processed there is to be confirmed with VERBUND. Use of inputs for training and data location were not checked against the current terms |

No hosting, analytics, fonts or other content from third parties is loaded by the app.

The repository currently lies in one student's personal GitHub account. For the handover it has to be transferred to an account VERBUND or WU controls, or handed over as an archive.

**Use of AI.** All code, the placeholder content and this documentation were written with Claude Code on instructions of the student team. Reviewed by: type check, 45 automated tests, dependency audit, a search of the history for secrets, and click-throughs in the browser at desktop and phone width. A line-by-line review by a developer has not taken place.

## Dependencies and licences

| Package | Version | Licence | Use |
|---|---|---|---|
| react, react-dom (with scheduler) | 19.3.1 | MIT | runtime |
| vite | 8.3.8 | MIT | build |
| @vitejs/plugin-react | 6.3.0 | MIT | build |
| typescript | 7.0.2 | Apache-2.0 | type check |
| vitest | 5.1.0 | MIT | tests |
| jsdom | 31.0.1 | MIT | click tests |
| @testing-library/react, @testing-library/dom | 16.3.3, 10.4.2 | MIT | click tests |
| @types/react, @types/react-dom | 19.3.0 | MIT | type check |

Container images: `node:24-alpine` (build), `nginxinc/nginx-unprivileged:stable-alpine` (runtime). Exact versions of all packages are locked in `package-lock.json`. Only React reaches the browser; its licence allows any further use.

## Tests

`npm test` runs 45 tests.

- **34 unit tests**: gaps and status in words, totals and trend, heatmap, prioritisation, minimum group size, stages and next steps, consistency of the content files.
- **11 click tests of the whole app** (`src/app.test.tsx`, jsdom and Testing Library): every page opens with a heading; every navigation link in every role works; the start page and the logo; the View-as menu; the preview panel for persons, pipeline cards and heatmap cells; the whole journey from self-check through the conversation to the changed HR totals; reload and reset.

The CI workflow (`.github/workflows/ci.yml`) runs on every push: tests, build, `npm audit`, the container build, a start as an arbitrary non-root user, the health endpoint, the security headers, and the syntax of the OpenShift manifests.

Manual test: as employee do the self-check; as manager open that person's conversation, agree all levels, choose a focus and a measure, complete it; check that the employee's profile and the HR figures changed; reset the demo data.

## Assumptions

- The check is part of the existing yearly appraisal talk and takes about twenty minutes.
- Six AI competencies in three groups, three described levels plus "not yet", one target profile per job family for today and for 2030.
- Three focus job families and managers as a separate group, as agreed in the project.
- Levels are agreed by two people; no AI rates anyone.
- The data serves development only and is not used for pay or appraisal.
- A person works on at most two focus areas at a time.
- Totals are shown from five rated employees up.

## Known limitations

- No backend, no login; data stays in one browser and does not sync between users.
- Content is not validated against VERBUND's competency model or the project's interview results.
- The sample ratings are random around today's level, so the figures show how the screens work and are no finding.
- Gaps are ordered by urgency and size; strategic relevance is not weighted.
- Click tests run in a simulated browser; there are no tests in real browsers and no visual regression tests.
- Cards in the pipeline cannot be dragged; they move when the state of the person changes.
- The look follows VERBUND's public material (company presentation, verbund.com, the V-Go app). VERBUND's fonts are licensed and replaced by the fallbacks its website names; no logo or other brand asset is included.

## From prototype to productive use

Following the guidelines makes the prototype easier to assess; it does not approve it. A productive tool would need VERBUND's Technology-Demand process and, in substance:

1. A backend with a database, login through the company directory, and roles enforced on the server.
2. A works agreement on recording competencies (purpose, access, retention), a data-protection assessment and information classification.
3. The real competency model, target profiles and measures, and a decision whether the tool stands alone or the logic moves into the existing HR system.
4. Architecture and security review, vulnerability assessment, an operating and support model.
5. A German user interface and an accessibility check.

## Handover checklist

Status against the minimum checklist of the technical guidelines.

| # | Item | Status | Where |
|---|---|---|---|
| 1 | No real VERBUND data or production credentials | Yes | Data and security |
| 2 | No secrets hardcoded | Yes; history searched | Configuration and secrets |
| 3 | Source code complete and accessible | Yes; repository still in a personal account | External services and AI |
| 4 | Can be installed and started from the documentation | Yes | Run it |
| 5 | Containerised, preferably OpenShift, at least Docker | Docker: yes, checked in CI. OpenShift: example manifests, not applied to a cluster | Run it |
| 6 | Configuration through environment variables or separate files | Yes; read at build time | Configuration and secrets |
| 7 | External dependencies and licences documented | Yes | Dependencies and licences |
| 8 | External cloud, SaaS and AI services listed | Yes; terms of the two services not checked in detail | External services and AI |
| 9 | AI-generated results and code reviewed | By tests and click-throughs; no line-by-line review by a developer | External services and AI |
| 10 | Mocked data, interfaces and functions identified | Yes | Functional, mocked, out of scope |
| 11 | Architecture and main components documented | Yes | Architecture |
| 12 | Tests or documented test procedures | Yes | Tests |
| 13 | Known limitations and security considerations | Yes | Known limitations; Data and security |
| 14 | Clearly distinguished from a production-ready solution | Yes; also stated in the app | From prototype to productive use |
| 15 | Recommendations for further development | Yes | From prototype to productive use |

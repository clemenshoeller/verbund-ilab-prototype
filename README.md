# AI Competency Check – prototype

Clickable prototype from the WU Industry Lab project "Closing the AI Talent Gap in the Energy Industry" with VERBUND (deliverable D5).

It shows one idea: **one competency conversation per person and year, as part of the yearly appraisal talk, and what the company learns from all of them.** An employee prepares with a self-check, manager and employee agree on a level per AI competency against the target profile of the job family, choose at most two focus areas and a measure, and HR sees the totals without seeing a single person.

> A prototype with invented data and placeholder content. Not approved for productive use (see [From prototype to productive use](#from-prototype-to-productive-use)).

## Contents

- [What it demonstrates](#what-it-demonstrates)
- [Open it without installing](#open-it-without-installing)
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

The manager's record of a person shows where the self-check and the manager's view were apart, on the level scale and linked to that step of the conversation; the team dashboard shows per competency who has reached the 2030 target and can help others, and flags a skill held by only one person. Both ideas come from Abdullah's prototype "Team skills compass" in the student team.

The start page walks through one person's journey and gives the reasons for the design, with sources. "Data model and status" lists the records behind the screens.

Design principles: every page opens with a sentence that states the result; levels are described in behaviour with an example per job family; detail opens on demand; the check serves development only; HR sees groups from five rated employees up.

## Open it without installing

| Way | How |
|---|---|
| Link | https://clemenshoeller.github.io/verbund-ilab-prototype/ opens the current version in the browser. Published by GitHub Pages on every push to `main` |
| One file | `npm run build:single` writes `dist-single/ai-competency-check.html`, about 400 kB. Send it by mail or chat; a double click opens it in the browser, without a server and offline |

Both hold only the built app with the invented data. What someone enters stays in that person's browser.

## Run it

Requires Node.js 22.12 or newer.

```bash
npm install
npm run dev        # http://localhost:5173 (next free port if taken)
npm test           # 66 tests
npm run lint       # code and accessibility rules
npm run build      # production build in dist/
npm run build:single   # the same as one HTML file in dist-single/
```

With Docker. The container listens on port 8080 and runs without root:

```bash
docker build -t ai-competency-check .
docker run --rm -p 8080:8080 ai-competency-check
```

Then open http://localhost:8080. `GET /healthz` answers `ok`.

On OpenShift: `deploy/openshift.yaml` holds a Deployment, a Service and a Route. Push the image to a registry the cluster can reach, replace the image placeholder and apply the file. The Deployment and the Service are rolled out on a Kubernetes cluster (kind) in CI on every push, under the restricted pod security standard and with a random user ID, the way OpenShift starts containers. They were not applied to an OpenShift cluster; the Route is specific to OpenShift and untested.

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
  a11y.test.tsx        accessibility tests with axe-core
scripts/generate-sample-org.mjs   builds data/org.json
scripts/build-single.mjs          packs the build into one HTML file
deploy/nginx.conf, deploy/openshift.yaml
Dockerfile, .github/workflows/ci.yml (checks), .github/workflows/pages.yml (demo link), biome.json (lint rules)
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

Because Vite reads them at build time, changing them means building the image again: `docker build --build-arg VITE_DATA_SOURCE=api --build-arg VITE_API_BASE_URL=https://... .` With a backend on another address, `connect-src` in `deploy/nginx.conf` has to allow it.

Edits made in the app are saved in the browser together with a fingerprint of the sample data. If the sample data changes, old edits are dropped; saved content that cannot be read is dropped as well.

## Data and security

- No real VERBUND data, accounts, systems or interfaces. No personal data of real persons.
- In mock mode the app makes no network requests after loading; ratings never leave the browser.
- Free text is limited to 300 characters and shown as text (React escapes it). The code uses no `innerHTML`, no `eval` and writes nothing to the console.
- A page that fails shows a plain message without technical detail; if the whole app fails, the message offers to reset the demo data and reload.
- The demo link is public but asks search engines not to list it (`noindex`). GitHub Pages does not send the security headers named in the next point; they belong to the container.
- The container runs without root and sends a Content-Security-Policy, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` and `Permissions-Policy` with every response; the nginx version is not shown. The page itself is never cached, the hashed asset files for a year.
- The git history is scanned for keys, tokens and passwords in CI (gitleaks): none.
- `npm audit` reports no known vulnerabilities (checked on every push).
- "HR sees no persons" and "groups under five are hidden" hold for every HR figure: totals, teams, competencies, heatmap, measures, previews and the dashboard, which shows nothing before five conversations are completed. One function decides it (`tooFew` in `src/lib/metrics.ts`). Without a login these are rules of the display, not access control.
- Keyboard: every control is reachable; the heading takes the focus after a page change; a skip button leads to the content; the search works with arrow keys; the page behind an open preview cannot be reached.

## External services and AI

Two external services were used to build the prototype; one of them, GitHub, also hosts the demo link. The app itself loads no analytics, fonts or other content from third parties.

| | GitHub | Claude Code (Anthropic) |
|---|---|---|
| Used for | Source code in a repository of a personal account, public since 17.11.2026 so that the demo link can be offered; GitHub Actions for tests and container build; GitHub Pages serves the built app at the demo link | Writing code, placeholder content and documentation, through the desktop app with a personal subscription |
| What goes there | Source code and invented data; with Pages also the built app. Visitors of the demo link reach GitHub's servers, which see their IP address | Instructions of the student team, the files of this repository, the team's own project notes, colours and fonts of public VERBUND material |
| Where data is processed and stored | "GitHub stores data for GitHub.com in the USA" by default; a choice of region exists only for GitHub Enterprise Cloud with data residency [1]. The privacy statement names processing in the US and other countries [2] | Runs locally; prompts, file contents and command output go to Anthropic over TLS [8]. For commercial products the data "is stored in the US" [11]; for personal plans no page states the location beyond "US servers or other countries" in the privacy policy [12] |
| Used for model training | Stored content of private repositories is not used [3][4]; since 17.11.2026 the repository is public, so that statement no longer covers it, and what the terms say for public repositories was not checked. Content given as input to AI features (Copilot) may be used unless opted out [3][4]. Copilot was not used for this repository | Personal plans (Free, Pro, Max): used for training when the setting "Help improve our AI models" is on, Claude Code included [8][9]. Commercial plans (Team, Enterprise, API): not used unless the customer opts in [8]. **Which way the setting is on the account used here was not checked** |
| Retention | Actions logs and artifacts 90 days by default, deletable earlier [6] | Personal plans: 30 days with the training setting off, up to 5 years with it on; deleted conversations leave the back end within 30 days [8][10]. Local transcripts lie in plain text under `~/.claude/projects/` [8] |
| Subprocessors | List published (for example AWS, Google Cloud, Cloudflare) [5] | List published in the Trust Center (for example Google Cloud, AWS, Azure, Cloudflare) [13] |
| Deletion | The owner can delete the repository; it can be restored for 90 days [6] | Conversations can be deleted; local transcripts with `claude purge` [8] |
| Access control | Anyone can read the public repository and open the demo link; only the owner and invited collaborators can change it. Two-factor authentication is required for contributors [7] | Bound to the personal account |
| Transfer and export | Transfer to another owner in the repository settings; `git clone` gives the full history, the ZIP download has no history [6] | Not applicable; the result is the code in the repository |

What follows for the handover:

- The repository lies in one student's personal GitHub account and has to be transferred to an account VERBUND or WU controls, or handed over as an archive (`git bundle` with history, or ZIP without).
- Whether the team's notes from talks with VERBUND may be processed in an externally hosted AI service is to be confirmed with VERBUND. No VERBUND credentials, systems or data sets were entered.
- The training setting of the Claude account should be checked and, if it is on, switched off for further work on the project (claude.ai → Settings → Privacy).

**Use of AI.** All code, the placeholder content and this documentation were written with Claude Code on instructions of the student team. Reviewed by: type check, lint with accessibility rules, 62 automated tests including an accessibility check with axe-core, dependency audit, a scan of the git history for secrets, click-throughs in the browser at desktop and phone width, and a second, independent review pass by an AI agent that had not written the code (see below). A line-by-line review by a human developer has not taken place.

**Findings of the independent AI review (16.11.2026), all fixed and covered by tests:** the HR role showed figures that rested on one or two managers of a team; broken saved data could blank the app with no way back; saved edits could shadow new sample data; editing a note reopened a completed conversation; focus areas could lock after a level was raised; organisation-wide figures had no minimum group size; settings could not be passed to the container build. Accessibility: focus was lost on every page change, search results could not be reached by keyboard, the preview was not really modal, clickable rows were not announced as controls, the role menu had no keyboard support. Not acted on: the number of nginx worker processes under a small memory limit, judged a low risk.

Sources, opened on 16.11.2026 (effective dates as shown on the pages; they should be rechecked before being cited formally):
[1] https://docs.github.com/en/enterprise-cloud@latest/admin/data-residency/about-github-enterprise-cloud-with-data-residency ·
[2] https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement ·
[3] https://docs.github.com/en/site-policy/github-terms/github-terms-of-service ·
[4] https://github.blog/changelog/2026-03-25-updates-to-our-privacy-statement-and-terms-of-service-how-we-use-your-data/ ·
[5] https://docs.github.com/en/site-policy/privacy-policies/github-subprocessors ·
[6] https://docs.github.com/en/repositories/creating-and-managing-repositories/deleting-a-repository, https://docs.github.com/en/repositories/creating-and-managing-repositories/transferring-a-repository, https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository, https://docs.github.com/en/repositories/working-with-files/using-files/downloading-source-code-archives ·
[7] https://docs.github.com/en/repositories/creating-and-managing-repositories/about-repositories, https://docs.github.com/en/authentication/securing-your-account-with-two-factor-authentication-2fa/about-two-factor-authentication ·
[8] https://code.claude.com/docs/en/data-usage ·
[9] https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training ·
[10] https://privacy.claude.com/en/articles/10023548-how-long-do-you-store-my-data ·
[11] https://privacy.claude.com/en/articles/7996890-where-are-your-servers-located-do-you-host-your-models-on-eu-servers ·
[12] https://www.anthropic.com/legal/privacy ·
[13] https://trust.anthropic.com/subprocessors

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
| @biomejs/biome | 2.6.8 | MIT OR Apache-2.0 | lint |
| axe-core | 4.14.1 | MPL-2.0 | accessibility tests |

Container images: `node:24-alpine` (build), `nginxinc/nginx-unprivileged:stable-alpine` (runtime). Exact versions of all packages are locked in `package-lock.json`. Only React reaches the browser; its licence allows any further use.

## Tests

`npm test` runs 66 tests.

- **39 unit tests**: gaps and status in words, focus areas, totals and trend, heatmap, prioritisation, minimum group size, stages and next steps, loading of saved data, consistency of the content files.
- **2 accessibility tests** (`src/a11y.test.tsx`, axe-core): no violations on 25 pages, nor with the role list, the search results or a preview open. Colour contrast is excluded because the simulated browser cannot compute it.
- **25 click tests of the whole app** (`src/app.test.tsx`, jsdom and Testing Library): every page opens with a heading; every navigation link in every role works; the start page and the logo; the View-as list; the search with arrow keys; the preview panel for persons, pipeline cards and heatmap cells; the whole journey from self-check through the conversation to the changed HR totals; the list of differences in view, who on the team can help others, and that closing the preview does not move the page; reload and reset; and one test for each finding of the code review.

A second workflow (`.github/workflows/pages.yml`) runs the tests, builds the app and publishes it at the demo link on every push to `main`.

The CI workflow (`.github/workflows/ci.yml`) runs on every push to `main` and on pull requests, in four jobs: lint, tests, build and `npm audit` (fails from severity high); the container build with a start as an arbitrary non-root user, the health endpoint, the security and cache headers and a second build with settings passed in; a rollout of the manifests on a Kubernetes cluster; a scan of the whole git history for secrets (gitleaks). After a transfer to a GitHub organisation the gitleaks action needs a licence key, or has to be replaced by the gitleaks command line.

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
- Click and accessibility tests run in a simulated browser; there are no tests in real browsers, no visual regression tests and no check of colour contrast.
- The linter reports no errors and about 80 warnings, most of them places where the code assumes that a record exists (`!`) and the order of rules in the stylesheet.
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
| 3 | Source code complete and accessible | Yes; repository public, still in a personal account | External services and AI |
| 4 | Can be installed and started from the documentation | Yes | Run it |
| 5 | Containerised, preferably OpenShift, at least Docker | Docker: yes, checked in CI. Kubernetes: Deployment and Service rolled out in CI under the restricted policy with a random user ID. OpenShift itself: not tried; the Route is untested | Run it |
| 6 | Configuration through environment variables or separate files | Yes; read at build time, passed to the container build as build arguments | Configuration and secrets |
| 7 | External dependencies and licences documented | Yes | Dependencies and licences |
| 8 | External cloud, SaaS and AI services listed | Yes, with data location, training use, retention, subprocessors, deletion and export; the training setting of the Claude account is unchecked | External services and AI |
| 9 | AI-generated results and code reviewed | By lint, tests, accessibility checks and an independent AI review; no line-by-line review by a human developer | External services and AI |
| 10 | Mocked data, interfaces and functions identified | Yes | Functional, mocked, out of scope |
| 11 | Architecture and main components documented | Yes | Architecture |
| 12 | Tests or documented test procedures | Yes | Tests |
| 13 | Known limitations and security considerations | Yes | Known limitations; Data and security |
| 14 | Clearly distinguished from a production-ready solution | Yes; also stated in the app | From prototype to productive use |
| 15 | Recommendations for further development | Yes | From prototype to productive use |

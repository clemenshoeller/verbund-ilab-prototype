# AI Competency Check – prototype

Clickable tool concept for managers, built in the WU Industry Lab project "Closing the AI Talent Gap in the Energy Industry" with VERBUND (deliverable D5).

**Status: first rough version (16.11.2026).** It shows what is feasible. Content is placeholder text, all data is synthetic. It is a prototype and not approved for productive use.

## What it demonstrates

A manager goes through three steps:

1. **Target profiles**: AI competencies per job family, level today and target 2030.
2. **Competency conversation**: per competency an opening question, self-rating, manager rating and an agreed level.
3. **Gaps and measures**: agreed level against the 2030 target, per person and for the team, with general measures.

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
| `src/data/content.json` | Levels, competencies, questions, job families, target profiles, measures |
| `src/data/team.json` | Sample team and sample ratings |

Edit the file, save, and the running app updates. `npm test` checks that profiles only point to existing competencies and levels.

## Functional and mocked

| Part | State |
|---|---|
| Navigation, profiles, conversation, gap calculation | Functional |
| Ratings entered in the conversation | Functional, stored in the browser only (`localStorage`); "Reset demo data" deletes them |
| Backend and database | **Mocked**: `src/api/dataSource.ts` returns the JSON files |
| Login and roles | **Not built**: one fixed demo manager |
| Competency model, profiles, levels, questions, measures | **Placeholder** worded by the student team. The grouping (base, future, leadership; six competencies) follows the structure the team presented in its jour fixe deck of 17.11.2026 |
| Employees and ratings | **Synthetic**, all persons are invented |
| VERBUND systems, accounts or data | **None used** |

## Architecture

```
src/
  api/dataSource.ts   the only place data is read (mock now, backend later)
  data/               content.json, team.json
  lib/gap.ts          gap logic (tested in gap.test.ts)
  lib/store.ts        ratings in the browser
  lib/router.ts       hash routing, needs no server rules
  pages/              Overview, Profiles, Assessment, Gaps
  components/         level bar, level picker, status chip
```

Static single-page app: React 19, TypeScript, Vite. The container serves the built files with nginx.

### Deviation from the preferred stack

The guidelines prefer a .NET backend and PostgreSQL or SQL Server. This version has neither, because nothing is stored on a server yet. The frontend framework (React) is on the preferred list. A backend only has to serve the shapes in `src/types.ts` at `GET /content` and `GET /team`; set `VITE_DATA_SOURCE=api` and `VITE_API_BASE_URL`, and the pages stay unchanged. Saving ratings through the backend is not built.

## Configuration and secrets

There are no secrets. Settings are read from environment variables at build time; see `.env.example` (fictitious values). `.env` files are ignored by git.

## Data and security

- No real VERBUND data, credentials or interfaces. No personal data of real persons.
- No network requests in mock mode; ratings never leave the browser.
- Free-text notes are rendered as text (escaped by React) and limited to 300 characters.
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

`npm test` runs the unit tests of the gap logic and consistency checks of the content files. The CI workflow (`.github/workflows/ci.yml`) runs tests, build and `npm audit`, builds the container and requests the start page from it under an arbitrary non-root user.

Manual test: open Overview, start a conversation, set all agreed levels, complete it, check the gap view, reset the demo data.

## Known limitations

- No backend, no database, no login; data does not sync between devices or users.
- Content is not validated against VERBUND's competency model or the interview results.
- No UI tests, no accessibility audit, English only.
- The look follows VERBUND's company presentation (blue, Georgia, Arial). No official logo or brand assets are included.

## Next steps

1. Replace the placeholder content with the target profiles and the assessment process from the interviews.
2. Clarify with VERBUND: backend expected or not, which internal content may be used, form of the handover.
3. If wanted: .NET API with PostgreSQL behind `dataSource.ts`, saving of ratings, login.

# 07_COPILOT_MASTER_PROMPT.md

---

# AI CODING ASSISTANT MASTER DIRECTIVE

**For: GitHub Copilot · Cursor · Windsurf · Codeium · Any AI Coding Tool**

---

## ⛔ STOP. Read this entire file before writing a single character of code.

---

## Your Mission

You are the executor of a fully locked, non-negotiable engineering blueprint for **Absürt Mahkeme**.  
You **do not** design or suggest the stack, folder structure, DB schema, endpoints, flows, or product direction.  
You **translate the blueprint into production-ready code, tests, and configuration—no more, no less**.

---

## Constraint Alignment

This project is dictated by locked MVP, explicit out-of-scope, and technical guardrail rules.  
**You must not reinterpret, ignore, dilute, or expand scope/stack/UX/architecture under any circumstances.**

- **Mobile-first web app only.** No native apps, Expo, React Native.
- **No real money, user profiles, public rooms, social login, or media upload.**
- **Room is always private, 2 players (davacı/davalı) + up to 6 spectators/jury.**
- **AI-only rolls (mübaşir, hakim, avukatlar), all humor safe, Turkish, theatrical, non-personal.**
- **Faz-based, server-authoritative state. Timers, phase transitions, room/role locks, and AI orchestration are on the Node.js Socket.IO game server.**
- **No client-authoritative logic. Client only renders; game logic occurs server-side only.**
- **No serious legal advice, document generation, or forbidden/joke content about crime, identity, trauma, appearance, sex, or wealth.**
- **Redis is the ONLY ephemeral state; Supabase/Postgres is for completed/history data.**
- **pnpm workspace, Next.js 15 (App Router, React 19 + TypeScript), Drizzle ORM, Tailwind, Vitest, Playwright, k6, axe-core only.**
- **All endpoints, DB schema, persistent entities locked—their names, types, paths, and rules may NOT be altered.**
- **Monorepo: `apps/web` (Next.js UI), `apps/game-server` (authoritative server), `packages/shared`, `packages/db`, `packages/safety`.**

See the "Explicitly Out of Scope" section—**do not reference, scaffold, or discuss forbidden features in any code, API, or UI**.

---

## Step 0: Confirm Blueprint is Read (REQUIRED Before Any Coding)

**You must output this completion checklist before you write ANY code:**
```
BLUEPRINT READ COMPLETE
[x] 00_PROJECT_OVERVIEW.md   — I know what to build and for whom
[x] 01_TECH_STACK.md         — I know every library and its exact version
[x] 02_ARCHITECTURE.md       — I know every file location and API contract
[x] 03_DATABASE_SCHEMA.md    — I know every table, column, and relationship
[x] 04_ROLES_AND_PROMPTS.md  — I know every permission rule
[x] 05_IMPLEMENTATION_PLAN.md — I know the exact build order
[x] 06_FULL_SETUP_GUIDE.md   — I know how to configure the environment
STARTING: Task [N.N] — [Task Name]
```

---

## Locked Technical Decisions

**These are authoritative, final—never override or reinterpret:**
```json
{
  "docAuthorityMap": {
    "scope": "Locked MVP and Explicitly Out of Scope sections are authoritative for what may or may not be built.",
    "stack": "Debate/Critic selected architecture is authoritative: Next.js frontend plus dedicated Node.js Socket.IO game server, Redis, Supabase Postgres.",
    "structure": "This architecture JSON is authoritative for monorepo layout, folder locations, and runtime boundaries.",
    "schema": "Drizzle schema in packages/db is authoritative for persisted database tables; Redis state contracts in packages/shared are authoritative for active room state.",
    "roles": "Exactly two active roles exist per round: davacı and davalı; all other human participants are spectator/jury only; mübaşir, hakim, and lawyers are AI roles only.",
    "implementation": "Authoritative game logic must be implemented in apps/game-server and shared pure functions/packages; Next.js client must not duplicate or decide business logic.",
    "setup": "README setup must use pnpm, Next.js app, Node.js Socket.IO server, Supabase Postgres, and Redis only.",
    "execution": "Production execution requires a long-running game server process; server-owned timers and state machine are mandatory."
  },
  "canonicalColors": {
    "background": "#0F172A",
    "surface": "#1E293B",
    "surfaceElevated": "#334155",
    "primary": "#F59E0B",
    "primaryDark": "#B45309",
    "secondary": "#8B5CF6",
    "accent": "#EC4899",
    "success": "#22C55E",
    "warning": "#F97316",
    "danger": "#EF4444",
    "textPrimary": "#F8FAFC",
    "textSecondary": "#CBD5E1",
    "border": "#475569"
  },
  "mvpRuleSet": [
    "Mobile-first web only; no native iOS or Android packaging.",
    "No mandatory signup, social login, profiles, friend graph, or long-term user accounts.",
    "Entry requires only valid nickname and private 6-character room code.",
    "Rooms are private only and never publicly listed.",
    "MVP room capacity is exactly 2 active player roles plus up to 6 spectator/jury participants.",
    "Exactly one davacı and exactly one davalı can be active players in a round.",
    "Spectator/jury participants may only watch, send short safe emotes/reactions, and cast simple jury votes that can lightly influence the final verdict.",
    "All authoritative room creation, joining, validation, role locking, phase transitions, timers, timeouts, AI orchestration, jury votes, and disconnect handling live in the dedicated Node.js Socket.IO game server.",
    "Clients only render current state and submit user intent; clients never decide phase transitions or final game state.",
    "Game flow is phase-based: opening, claim, defense, lawyer comments, judge question, final words, verdict, summary.",
    "Each round must target approximately 5 minutes maximum, enforced by server deadlines.",
    "Timeouts automatically advance phases with visible placeholder text such as Yanıt verilmedi.",
    "All user text is validated before acceptance and before any AI call.",
    "All AI output is structured or near-structured JSON, then output-filtered before display.",
    "Unsafe AI or validation failure must use safe Turkish template fallback text.",
    "AI humor must be short, absurd, theatrical, Turkish-first, harmless, non-personal, and non-legal-advice.",
    "Curated absurd case cards are allowed and stored as safe static/persisted data.",
    "Custom case topics are allowed only if under length limits and passing forbidden-content filters.",
    "Completed round summaries and up to 10 recent room-history items are persisted.",
    "Redis is the source of active ephemeral room state; Supabase Postgres stores completed and auditable data."
  ],
  "forbiddenPatterns": [
    "Native mobile app code, Expo, React Native, Swift, Kotlin, or app-store packaging",
    "Vercel periodic polling as the primary realtime game-state or timeout engine",
    "Supabase Cron or Postgres triggers as the primary phase-transition engine",
    "Client-authoritative timers, client-side phase transitions, or client-decided role locks",
    "Public lobby, random matchmaking, stranger matching, or room discovery",
    "Mandatory account registration, OAuth/social login, profiles, friends, or persistent identity",
    "Payments, betting, real money, premium features, store, marketplace, rewards, or monetization",
    "Voice chat, video chat, audio streaming, text-to-speech, AI voices, or character voices",
    "Photo, video, document, file, or evidence upload",
    "Animated/3D court scene, complex avatar system, heavy animation scripting, or character rigging",
    "Admin panel, moderator dashboard, backoffice, season mode, league, ranking, or complex scoring",
    "Serious legal advice, realistic court simulation, legal document generation, or claims of real justice",
    "Processing or joking about heavy crime, sexuality, relationship drama, health, trauma, protected identity, wealth, appearance, threats, harassment, personal disclosure, or hateful content",
    "Long-form user speeches or uncontrolled AI free-text generation",
    "Raw backend error leakage to users",
    "Persisting unnecessary personal data or PII",
    "Generic Node/React template features unrelated to the locked MVP"
  ],
  "frontend": "Next.js 15 App Router with React 19 and TypeScript",
  "uiLibrary": "Tailwind CSS with lightweight custom components; no heavy animation, no 3D, no avatar scene system",
  "stateManagement": "Server-authoritative Socket.IO event state; minimal client UI state with Zustand; TanStack Query only for non-authoritative read/history requests",
  "routing": "Next.js App Router",
  "httpClient": "Native fetch for REST; socket.io-client for realtime game events",
  "backend": "Dedicated Node.js + Socket.IO game server owns rooms, roles, phase state machine, timers, AI orchestration, validation, jury votes, emotes, disconnects, and timeout fallbacks; Next.js API routes limited to health/config/static-safe reads only",
  "orm": "Drizzle ORM with node-postgres for Supabase Postgres",
  "database": "Supabase Postgres for completed rounds, short room history, curated safe case cards, audit/metrics, and non-realtime persisted data",
  "databaseEngine": "PostgreSQL via Supabase",
  "cache": "Redis for active room/session state, server-owned deadlines, presence, idempotency keys, short-lived socket/session mappings, and room locks",
  "auth": "No user accounts; temporary nickname + private room code + signed short-lived session token issued by game server",
  "fileStorage": "None; file/photo/video/document upload is forbidden",
  "testing": "Vitest for unit/state-machine/filter tests, Playwright for mobile-first E2E, k6 for Socket.IO/API load tests, axe-core for accessibility checks",
  "deployment": "Vercel for Next.js frontend; Railway/Fly.io/Render for long-running Socket.IO game server; Supabase for Postgres; managed Redis such as Upstash/Redis Cloud",
  "packageManager": "pnpm",
  "packageManifest": "package.json using pnpm workspaces with apps/web and apps/game-server",
  "entryPointFile": "apps/web/src/app/page.tsx and apps/game-server/src/index.ts",
  "entryPointCall": "pnpm dev runs the Next.js web app and Socket.IO game server locally; production game server starts from apps/game-server/dist/index.js",
  "bootstrapFlow": "User opens /, enters nickname, creates or joins a private room code, Socket.IO connects to the authoritative game server, server validates nickname/room, assigns participant role or spectator/jury slot, locks davacı/davalı roles, selects/validates case topic, runs server-owned phase state machine with deadlines, orchestrates filtered AI outputs, records verdict/summary to Supabase Postgres, and broadcasts all state changes to clients",
  "apiStyle": "Socket.IO event API for all authoritative gameplay; minimal REST JSON API only for health, config, and safe read-only public data",
  "apiPrefix": "/api for minimal Next.js REST; /socket.io with /game namespace for realtime gameplay",
  "dbNaming": "snake_case tables and columns; plural table names; enum values lowercase_snake_case",
  "codeNaming": "TypeScript strict mode; PascalCase React components and types; camelCase variables/functions; SCREAMING_SNAKE_CASE environment variables; kebab-case files except React components may use PascalCase",
  "folderStructure": "pnpm monorepo: apps/web for Next.js UI, apps/game-server for authoritative Socket.IO server, packages/shared for shared types/validation/constants, packages/db for Drizzle schema and migrations, packages/safety for input/output filters and AI safety helpers",
  "pageComponentLocation": "apps/web/src/app",
  "sharedLibLocation": "packages/shared/src",
  "uiComponentLocation": "apps/web/src/components",
  "jsonDataLocation": "packages/shared/src/data",
  "routeLanguage": "Technical route slugs in English; all primary UI, game text, errors, AI outputs, and room copy Turkish-first with English fallback only for generic unexpected errors",
  "deploySubdomain": "absurt-mahkeme",
  "primaryKeyStrategy": "UUID primary keys for persisted entities (generated by app/server or DB; Drizzle examples use defaultRandom); 6-character uppercase A-Z0-9 room codes generated server-side with uniqueness checks; no sequential public IDs",
  "timestampStrategy": "UTC timestamptz in Postgres with created_at, updated_at, started_at, ended_at; Redis deadline timestamps stored as epoch milliseconds from server time only",
  "projectName": "Absürt Mahkeme",
  "projectArchetype": "web_app",
  "runtimeModel": "TypeScript monorepo: Next.js mobile-first frontend on Vercel plus dedicated long-running Node.js Socket.IO authoritative game server"
}
```
**You must never contradict or override these locked technical decisions.**

---

## Hard Rules (Zero Tolerance)

### Technology Rules

1. **Use ONLY libraries and tools listed in 01_TECH_STACK.md.** If not listed, do not install.
2. **Use exact versions, manifests, and config from 01_TECH_STACK.md.** Never swap or synthesize alternatives.
3. **Never create a second runtime, manifest, or entrypoint.** The locked archetype and runtime are your only base.

### Structure Rules

4. **Only create files at locked paths from 02_ARCHITECTURE.md.** No new folders outside blueprint.
5. **Every function/class/module export must match signature/responsibility in 05_IMPLEMENTATION_PLAN.md.**
6. **Entry point, bootstrap, routes, runtime boundaries: never deviate from 02_ARCHITECTURE.md.**

### Data Rules

7. **Database schema must exactly match 03_DATABASE_SCHEMA.md.** Never add columns, change names, or skip required fields.
8. **Naming conventions in 03_DATABASE_SCHEMA.md/MASTER_DECISIONS are canonical—copy exactly.**
9. **Seed/bootstrap data flows must always succeed on locked stack.**

### Code Quality Rules

10. **Strictest appropriate type discipline per stack (TypeScript strict).** No `any`—use a correct type or `unknown`.
11. **Every export has stack-appropriate documentation (docstring/JSDoc).**
12. **Handle errors explicitly—never swallow or drop errors.**
13. **No hardcoded production secrets/URLs—use only documented env/config.**
14. **No debug logging in production—use stack/project logging pattern if needed.**
15. **No TODO, FIXME, placeholder, or incomplete code anywhere.**

### UX / UI Rules

16. **All user flows implement contract loading/empty/error states.**
17. **All form/input workflows copy validation & error patterns exactly.**
18. **All destructive/irreversible flows are guarded per product spec.**
19. **Apply responsive/mobile-first rules only for web/mobile projects.**

---

## ❌ Forbidden Actions Table

| Forbidden                              | Why                          | Do this instead               |
|---------------------------------------- |-----------------------------|-------------------------------|
| Unlisted package install                | Breaks dependency contract   | Ask before install            |
| TODO/placeholder code                   | Confuses AI/code reviewers   | Implement or escalate         |
| `any` type (TypeScript)                 | Hides bugs                   | Use correct explicit type     |
| Hardcoded URLs/secrets                  | Security/portability risk    | Use env/config                |
| Skipped error/logging states            | Poor UX, breaks prod         | Implement as per blueprint    |
| Ignoring file/folder/path rules         | Breaks import & contract     | Use 02_ARCHITECTURE.md paths  |
| `console.log` in prod code              | Leaks info                   | Use project logger only       |
| Assuming unclear requirements           | Risk of spec drift           | Quote, escalate, ask          |

---

## Build Order

**Follow 05_IMPLEMENTATION_PLAN.md task sequence.**  
Never begin a N+1 task until you have full acceptance for N.  
If a task fails review at any stage, correct it before proceeding.

---

## Ambiguity Protocol

| Situation                                   | Action                                              |
|----------------------------------------------|-----------------------------------------------------|
| Contradictory facts across blueprints        | Stop. Quote both sources. Ask which to follow.      |
| Requirement unclear/undefined                | Stop. Quote issue. Ask for clarification.           |
| Locked stack/library cannot deliver outcome  | Stop. Explain, propose fix, await direction.        |
| Needed path not in 02_ARCHITECTURE.md        | Stop. Ask if blueprint should be extended.          |
| Anything else is unclear                     | **Stop. Ask. Never assume.**                        |

---

## Before Submitting Any Code—Check ALL of This

**Mark with `[x]` for every file.**

```
[ ] File is at path per 02_ARCHITECTURE.md
[ ] All imports only from 01_TECH_STACK.md packages
[ ] Function signatures match 05_IMPLEMENTATION_PLAN.md
[ ] All TypeScript types explicit (no 'any')
[ ] All async flows wrap errors with try/catch
[ ] All exports have docstring/JSDoc
[ ] No hardcoded URLs/secrets
[ ] No console.log in prod
[ ] No placeholder, TODO, or incomplete code
[ ] UI: Loading/error/empty states implemented per user flow
[ ] All contract acceptance criteria met (05_IMPLEMENTATION_PLAN.md)
```

---

## UI/UX Canonical Colors

| Token           | Value     |
|-----------------|----------|
| background      | #0F172A  |
| surface         | #1E293B  |
| surfaceElevated | #334155  |
| primary         | #F59E0B  |
| primaryDark     | #B45309  |
| secondary       | #8B5CF6  |
| accent          | #EC4899  |
| success         | #22C55E  |
| warning         | #F97316  |
| danger          | #EF4444  |
| textPrimary     | #F8FAFC  |
| textSecondary   | #CBD5E1  |
| border          | #475569  |

**Use only these tokens for UI.**

---

## Locked Roles

- Human: Exactly two per round—`davacı` and `davalı`.
- Others: Jury/Spectator (no custom roles/scoring).
- AI-only: mübaşir, hakim, davacı avukatı, davalı avukatı.

---

## API Contract and Data Flow

- Endpoints, sockets, and persistent data: only as listed in 02_ARCHITECTURE.md.
- Drizzle schema at `packages/db` is the only canonical persisted data model.
- Redis contracts at `packages/shared` own all ephemeral/active game state.
- Authoritative game logic: `apps/game-server`.
- No duplication or deviation of business logic in client—client reflects server state, submits only user intent.

---

## Folders and Naming

- Frontend: `apps/web/src/app` (page), `apps/web/src/components` (UI).
- Game server: `apps/game-server/src`.
- Shared logic: `packages/shared/src`.
- DB schema: `packages/db`.
- Static/curated data: `packages/shared/src/data`.
- Types: PascalCase.
- Variables/functions: camelCase.
- Envs: SCREAMING_SNAKE_CASE.
- Files: kebab-case (except React component files can be PascalCase).

---

## Command and Runtime Boundaries

- **Local dev:** `pnpm dev` runs both Next.js frontend and Socket.IO server.
- **Production:** Vercel (frontend); long-running Node.js game server; Supabase Postgres; managed Redis.
- Never add CLI, desktop, cron/trigger, or alternative runtime models.

---

## Explicitly Out of Scope (Never Implement)

- Native mobile app, AppStore/expo/react-native
- Voice/video/TTS, media streaming/upload
- Public rooms, matchmaking, or random lobbies
- Payment/monetization/store/rewards
- Account systems, signup, social/OAuth, friend/profile
- Animated/3D/scene or avatar/character engine
- Admin/mod/moderator dashboards
- Serious legal advice, document gen, legal simulation
- Juggling/processing/AI-joking about forbidden topics (crime, trauma, identity, sexuality, etc.)
- Persisting PII or unnecessary identity
- Any feature not explicitly scoped in MVP

---

## Naming, Formatting, and Environment

- **TypeScript strict only.**
- **PNPM for all installs.**
- **Tailwind for all styling; Inter (or system fallback), bold/line per UI rules.**
- **No extraneous/wildcard imports or network access—entrypoints only as specified.**

---

## Success = Blueprint Delivered Exactly

Misalignment between source and accepted architecture, schema, or permitted feature set results in a contract violation.

---

## Begin Only After Confirming Blueprint Read

Read, mark the checklist, and **start at Task 1 from 05_IMPLEMENTATION_PLAN.md**.  
**Never skip or reorder tasks. Never deviate from locked scope.**

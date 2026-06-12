# 05_IMPLEMENTATION_PLAN.md

## Constraint Alignment

**Locked contract compliance:**

- **Stack:** Next.js frontend (`apps/web`), dedicated Node.js Socket.IO game server (`apps/game-server`), Drizzle ORM (`packages/db`), Redis, Supabase Postgres.
- **Persistence:** Drizzle schema (03_DATABASE_SCHEMA.md) for all tables, forbidden topics list, and curated case cards.
- **Auth/session:** No user accounts; session tokens issued/validated server-side for all mutating events, enforced on every relevant Socket.IO handler.
- **Capacity/roles:** Exactly 2 active player roles per room (davacı, davalı) and up to 6 spectators/jury. Strict enforcement everywhere.
- **All AI or game logic, validation, phase orchestration, deadline enforcement:** Must be server-owned. No client-authoritative timers, transitions, or validation.
- **Forbidden:** No mobile/native/voice/video-file, no public lobby, monetization, profiles, friend graph, admin, file uploads, or pseudo–legal content.
- **Input/output filtering:** Every user and AI string passes server-owned safety check; unsafe content always replaced with safe fallback per contract.
- **Packaging/deploy:** Vercel for Next.js; long-running server for game-server; Supabase for Postgres; Redis managed service.
- **Out-of-scope:** Never allow forbidden features or second stack, manifest, schema, entrypoint, or architecture.

---

# Implementation Plan

## Ground Rules for AI Builder

1. Complete each task fully before starting the next.
2. After each task, verify the acceptance criteria before moving on.
3. Never create a file not defined in 02_ARCHITECTURE.md.
4. Never install a package or dependency outside 01_TECH_STACK.md.
5. Never create a DB object/scope/seed that diverges from 03_DATABASE_SCHEMA.md.
6. If a task depends on an earlier task, say so explicitly.

---

## Phase 1: Foundation

**Goal:** Bootstrapped monorepo workspace, persistence, and baseline endpoints/startup.

---

### Task 1.1: Workspace Bootstrap

#### Files to Create

| Path                                         | Reason                                                   | Source                         |
|-----------------------------------------------|----------------------------------------------------------|--------------------------------|
| `package.json`                               | pnpm monorepo root                                       | 01_TECH_STACK.md               |
| `pnpm-workspace.yaml`                        | Workspace packages layout                                | 01_TECH_STACK.md               |
| `.gitignore`                                 | Standard exclusions                                      | default                        |
| `README.md`                                  | Setup, dev, deploy, .env keys, migration/seed how-to     | 06_FULL_SETUP_GUIDE.md         |
| `apps/web/package.json`                      | Next.js 15, Tailwind CSS, state deps                     | 01_TECH_STACK.md               |
| `apps/web/tsconfig.json`                     | Project-wide TS configuration                            | 01_TECH_STACK.md               |
| `apps/web/src/app/page.tsx`                  | Next.js home entrypoint                                  | 02_ARCHITECTURE.md             |
| `apps/web/src/app/layout.tsx`                | Base layout/colors/SEO                                   | 02_ARCHITECTURE.md             |
| `apps/game-server/package.json`              | Node.js/Socket.IO/Drizzle/Redis deps                     | 01_TECH_STACK.md               |
| `apps/game-server/tsconfig.json`             | Game server strict type config                           | 01_TECH_STACK.md               |
| `apps/game-server/src/index.ts`              | Game server entrypoint                                   | 02_ARCHITECTURE.md             |
| `packages/db/package.json`                   | Drizzle ORM CLI                                          | 01_TECH_STACK.md               |
| `packages/db/tsconfig.json`                  | Drizzle strict typing                                    | default                        |
| `packages/db/drizzle.config.ts`              | Drizzle config for migrations                            | see below                      |
| `packages/shared/package.json`               | Shared types/constants                                   | 01_TECH_STACK.md               |
| `packages/safety/package.json`               | Filtering utilities and tests                            | 01_TECH_STACK.md               |

#### Bootstrap/install commands

```sh
pnpm install
pnpm lint
pnpm typecheck
pnpm build
pnpm dev
```

#### Acceptance Criteria

- Both frontend and game-server start with `pnpm dev` per contract (instructed in README.md).
- `/` and `/api/health` (Next.js) return 200.
- `apps/game-server` starts and responds on `/health`.
- No lint/typecheck/build errors in workspace (all TypeScript strict).
- Workspace matches folder/manifest structure as locked.

---

### Task 1.2: Data / Persistence Foundation

Setup Drizzle/Postgres, seed curated case cards, and enforce forbidden-topic list.

#### Files to Create

| Path                                                | Reason                                        |
|-----------------------------------------------------|-----------------------------------------------|
| `packages/db/src/schema.ts`                         | Tables, enums, relations as in 03_DATABASE_SCHEMA.md |
| `packages/db/drizzle.config.ts`                     | Config for migration/CLI                      |
| `packages/db/scripts/seed-case-cards.ts`            | Script to load cards from shared data         |
| `packages/db/package.json` (with migration scripts) | Migration/seed orchestration                  |
| `packages/shared/src/data/case_cards.json`          | Turkish, funny, safe topics                   |
| `packages/shared/src/data/forbidden_topics.json`    | Turkish forbidden-content blocklist           |
| `.env.example` (root)                              | Required Postgres, Redis, session, AI vars    |

#### Migration/seed scripts in `packages/db/package.json`:

```json
{
  "scripts": {
    "migrate": "drizzle-kit migrate:pg",
    "push": "drizzle-kit push:pg",
    "seed:cards": "ts-node scripts/seed-case-cards.ts",
    "check-schema": "drizzle-kit studio"
  }
}
```

#### Example migration output:

```
> pnpm migrate
[drizzle-kit] 🔨 Running migrations...
  0000_initial.sql
    ✓ rooms table created
    ✓ room_participants table created
    ✓ rounds table created
    ✓ player_statements table created
    ✓ case_cards table created
    ✓ jury_votes table created
    ✓ verdicts table created
    ✓ round_summaries table created
Done.
```

#### Example seeding output:

```
> pnpm seed:cards
Inserted 18 case cards
[
  {id: "cc_bakkal", title: "Bakkaldan alınan eksik sakız yüzünden büyük kavga", ...}
  ...
]
```

#### Acceptance Criteria

- All table/field names, datatypes, and relationships are exactly as per 03_DATABASE_SCHEMA.md.
- Cards table populated only with safe titles (tested against forbidden_topics).
- Any forbidden card in seed is auto-aborted with error exit and message like: "ERROR: Forbidden topic in case_cards seed ('cinsellik')."
- Running `pnpm db:migrate && pnpm db:seed:cards` on a fresh DB is repeatable and idempotent.

---

### Task 1.3: Application Entry and Bootstrap Flow

**Game-Server:**

- `apps/game-server/src/index.ts`
  - Exports `main()`, calls `bootstrapServer()`, loads `.env`, connects to Postgres and Redis, and attaches `/game` namespace to Socket.IO server.
- `apps/game-server/src/server.ts`
  - Exports `async function bootstrapServer()`.
  - Binds all handler mounts and registers `/health` endpoint for basic readiness.
- `apps/game-server/src/config.ts`
  - Validates required environment variables from `.env`.
- All health/config endpoints respond with status OK if all dependencies up.

**Frontend:**

- `apps/web/src/app/page.tsx`
  - Loads landing/nickname entry.
- `apps/web/src/app/layout.tsx`
  - Loads canonical color palette, SEO, font, and correct dark mode.

**Acceptance Criteria**

- `pnpm dev` launches both web and game-server.
- `/` and `/api/health` work on frontend; `/health` works on backend.
- Web is able to reach `/api/config` and render canonical palette.
- No duplicated entry point, runtime, or boilerplate.

---

### Task 1.4: Skeleton UI / Command Surface

**Files/Components:**

| Path                                                    | Responsibility                                            |
|---------------------------------------------------------|----------------------------------------------------------|
| `apps/web/src/app/layout.tsx`                           | Root layout, palette, SEO, Inter font                    |
| `apps/web/src/components/NavBar.tsx`                    | Title, simple navigation (Absürt Mahkeme)                |
| `apps/web/src/app/page.tsx`                             | Initial nickname/room code UX                            |
| `apps/web/src/app/room/[roomCode]/page.tsx`             | Room/lobby shell; renders per-phase component            |
| `apps/web/src/components/ErrorModal.tsx`                | Turkish error states                                     |
| `apps/web/src/components/LoadingSpinner.tsx`            | For AI, waits, or phase transitions                      |

**Acceptance Criteria**

- UI renders on `/`, `/room/[roomCode]`.
- Canonical colors (per locked `canonicalColors` tokens).
- No invented provider/extra stack.
- Navigation between landing and room shell is possible.

---

## Phase 2: First Vertical Slices

### Task 2.1: Nickname Entry and Validation

**Files:**

- `apps/web/src/app/page.tsx` (entry, UX)
- `apps/web/src/utils/validation.ts`
- `packages/safety/src/nicknameFilter.ts` (server-side)
- `apps/game-server/src/socketHandlers/validateNickname.ts`
- `packages/shared/src/types/session.ts`

**Backend Steps:**

- On `client:joinRoom`, server runs:
  - Length check: 2–18 UTF-8 chars.
  - Profanity or forbidden content (checked against `forbidden_topics.json`, Turkish vernacular, and reserved names).
  - Uniqueness in room (active session).
- If valid: issues signed session token, emits join state.
- If invalid: emits `server:error` with Turkish full-string.

**Acceptance Examples:**

- ✅ `SüperEge` → proceeds
- ❌ `  ` → "Lütfen 2-18 karakterlik uygun bir rumuz girin."
- ❌ `admin` → "Bu rumuz uygun değil."
- ❌ Duplicates: error event (nickname in room).

**All cases must be test-covered (unit and integration).**

---

### Task 2.2: Private Room Creation

**Files:**

- `apps/game-server/src/socketHandlers/clientCreateRoom.ts`
- `apps/game-server/src/services/room.ts`
- `apps/game-server/src/utils/generateRoomCode.ts`
- `packages/shared/src/types/room.ts`

**Flow:**

- On successful `client:createRoom`, server:
  - Generates unique code (A-Z0-9, 6 chars), verifies not in Redis.
  - Initializes room object, inserts into Redis with TTL.
  - Assigns participant as waiting, emits full room state and sessionToken signed for code/nick.
  - If capacity (2 players + 6 max spectators) is exceeded (shouldn't happen on create), rejects and emits error message.

**Acceptance:**

- ❌ collision on code: retries up to 3 times, fails with clear error if still not unique.
- Resulting room can be joined via code—guaranteed unique.
- Session token structure is opaque and signed (JWT or HMAC), short-lived (30 min TTL, reset on activity).

---

### Task 2.3: Join Private Room by Code

**Files:**

- `apps/game-server/src/socketHandlers/clientJoinRoom.ts`
- `apps/game-server/src/services/sessionToken.ts`

**Flow:**

- `client:joinRoom` emits `{ roomCode, nickname }`.
- Server checks:
  - Code exists in Redis and open for participants.
  - Nickname passes again full validation.
  - Room is not full: (davacı + davalı + spectators ≤ max room capacity)
- On success:
  - Adds participant.
  - Reissues sessionToken.
  - Broadcasts new room state with joined user.
- On bad code or full: returns Turkish error.

**Capacity Enforcement Example:**

```ts
const MAX_ACTIVE = 2;
const MAX_SPECTATORS = 6;
if (room.participants.length >= (MAX_ACTIVE + MAX_SPECTATORS))
  return error('Oda dolu.');
```

**Acceptance:**

- All join attempts beyond cap or with duplicate nick rejected.
- Valid join returns state and lets user select role.

---

### Task 2.4: Davacı/Davalı Role Selection

**Files:**

- `apps/game-server/src/socketHandlers/clientSelectRole.ts`
- `apps/game-server/src/services/roles.ts`
- `apps/game-server/src/events/serverRoomState.ts`

**Flow:**

- `client:selectRole`, e.g. `{ role: 'davaci' }`
- Server checks current roles in Redis (atomic transaction).
- Only one real participant per role in a round; all others are spectators/jury.
- Winning assignment is atomic; concurrent selects only grant winner.

**Acceptance:**

| Situation            | Outcome                                               |
|----------------------|------------------------------------------------------|
| Two click same role  | Only first wins; second gets "Rol kapıldı" in Turkish|
| Disconnect & rejoin  | Role reclaimable if original times out/disconnects   |

**Test race conditions and rejoin cases.**

---

### Task 2.5: Absurd Case Card Selection/Custom Topic Input

**Files:**

- `apps/web/src/components/CaseCardGrid.tsx`
- `apps/game-server/src/socketHandlers/clientSelectCaseCard.ts` / `clientSubmitCustomTopic.ts`
- `packages/db/src/repositories/caseCards.ts`
- `packages/safety/src/topicSafetyFilter.ts`

**Flow:**

- For curated card:
  - Shows cards (read from DB).
  - `client:selectCaseCard` emits card id.
  - Server validates existence in DB and in active cards.
- For custom:
  - `client:submitCustomTopic` emits raw string.
  - Server checks: 1–140 chars, not in forbidden_topics, not repeated.
  - Both paths update room, lock topic.
- Input always filtered on server—never on client.

**Acceptance:**

- Unsafe, blank, long, repeat topic → clear error.
- Selected case card reflects in broadcasted room state.

---

### Task 2.6: AI Mübaşir Dramatic Opening

**Files:**

- `apps/game-server/src/services/ai/mubasir.ts`
- `packages/safety/src/aiOutputFilter.ts`

**Flow:**

- On topic lock, server triggers AI (calls LLM with scenario) or falls back to template.
- Output passes `aiOutputFilter`:
  - Turkish main message, length ≤ 200, no forbidden content.
  - If output fails filter, reply is replaced with safe template string.
- Contract: output as `{role:'mubasir', message_tr, safety, ...}`; only message_tr used on UI.

**Acceptance:**

- Unit tests: Ensure no AI output with forbidden content reaches UI.
- Regression test: Simulate LLM output with illegal string—always fallback visible.

---

### Task 2.7: Phase Machine and Hard Server Deadlines

**Files:**

- `apps/game-server/src/state/roomStateMachine.ts`
- `apps/game-server/src/services/timer.ts`
- `apps/game-server/src/constants/phaseDefinitions.ts`
- `apps/web/src/components/PhaseTimer.tsx`

**Flow:**

- Every phase transition (state+deadline) is ONLY initiated server-side (Redis), never by client.
- Phase object includes: `phaseType`, `deadline`, `requiredInputs`.
- On timer expiry (no input): server advances phase and uses fallback "Yanıt verilmedi." for missing data.
- Fake/late client events are ignored after deadline.

**Acceptance:**

- Simulate slow/missing input: placeholder inserted, next phase broadcasted.
- All phase state updates within <1s of deadline expiry.

---

## Phase 3: Secondary MVP Completion

### Task 3.1: User Claim & Defense Statement Input

**Files:**

- `apps/web/src/components/StatementInput.tsx`
- `apps/game-server/src/socketHandlers/clientSubmitStatement.ts`
- `packages/safety/src/statementSafetyFilter.ts`

**Flow:**

- Applies only to correct role+phase.
- 10–140 UTF-8 chars, forbidden topic filter applied.
- On success: locks input, advances phase or waits for other role/timeout.
- Invalids: error-message, not accepted.
- Timeout: inserts "Yanıt verilmedi."

**Acceptance:**

- Cannot fake/duplicate input per phase from client.
- All forbidden/short/long input rejected server-side.

---

### Task 3.2: AI Lawyer Commentary & Hakim Question

**Files:**

- `apps/game-server/src/services/ai/lawyer.ts`
- `apps/game-server/src/services/ai/hakim.ts`
- `packages/safety/src/aiOutputFilter.ts`

**Flow:**

- After both player statements, triggers AI role events.
- AI outputs always structured JSON: `{role, message_tr, safety, ...}`
- aiOutputFilter: Max 180 chars, Turkish, not forbidden, fallback template used if unsafe.

---

### Task 3.3: Final Words

**Files:**

- `apps/web/src/components/FinalWordsInput.tsx`
- `apps/game-server/src/socketHandlers/clientSubmitFinalWords.ts`

**Flow:**

- 0–80 chars, same safety as before.
- Missing input on deadline: fallback "Yanıt verilmedi."

---

### Task 3.4: AI Hakim Verdict & Funny Ruling

**Files:**

- `apps/game-server/src/services/ai/verdict.ts`
- `packages/safety/src/aiOutputFilter.ts`
- `apps/web/src/components/VerdictCard.tsx`
- `packages/shared/src/types/verdict.ts`

**Flow:**

- AI hakim computes raw verdict percent (e.g., 70/30).
- Jury votes (see 3.6) applied via canonical adjustment formula:

  ```ts
  function computeJuryInfluencedVerdict(aiDavaciPercent, juryVotes) {
    const J_D = juryVotes.filter(v => v === 'davaci').length;
    const J_L = juryVotes.filter(v => v === 'davali').length;
    const J_TOTAL = J_D + J_L;
    if (J_TOTAL === 0) return [aiDavaciPercent, 100 - aiDavaciPercent];
    const jury_ratio = (J_D - J_L) / J_TOTAL;
    const EFFECT = Math.round(jury_ratio * 10);
    const new_davaci = Math.max(0, Math.min(100, aiDavaciPercent + EFFECT));
    return [new_davaci, 100 - new_davaci];
  }
  ```

- Ruling text (≤150 chars) is filtered as above.

---

### Task 3.5: Round Summary & Short History

**Files:**

- `apps/game-server/src/services/history.ts`
- `packages/db/src/repositories/roundSummary.ts`
- `apps/web/src/components/RoundSummaryList.tsx`

**Flow:**

- After each round: final snapshot is persisted to Supabase Postgres (`round_summaries`).
- GET `/api/rooms/:roomCode/history` returns last 10 per room.

---

### Task 3.6: Jury Vote & Emotes

**Files:**

- `apps/web/src/components/JuryVotePanel.tsx`
- `apps/game-server/src/socketHandlers/clientCastJuryVote.ts`
- `packages/shared/src/types/votes.ts`

**Flow:**

- Jury can only vote once per round; enforced by sessionToken and phase.
- Jury votes shape final verdict percent as described above.
- Emotes rate-limited, locked emoji set (e.g. 😂 🔥 👏 🤨 🥚).

---

### Task 3.7: Real-Time Presence & State Sync

**Files:**

- `apps/game-server/src/services/presence.ts`
- `apps/web/src/store/roomState.tsx`

**Flow:**

- All joins, leaves, disconnect events update room participant list and roles.
- Room closed if all leave; rejoin with code/nick resumes prior session unless expired.
- Spectator/jury participation capped at max 6 per room (enforced at join time).

---

### Task 3.8: Disconnect / No-answer / Leave Fallback

**Files:**

- `apps/game-server/src/services/timeout.ts`
- `apps/game-server/src/state/roomStateMachine.ts`

**Flow:**

- If a player disconnects mid-phase, after $timeout, advances phase and inserts safe placeholder such as "Yanıt verilmedi."

---

## Phase 4: Integration, Testing, and Hardening

### Task 4.1: Integration/E2E Tests

- `apps/web/tests/e2e/room-flow.spec.ts` (Playwright):
  - Validates create → join → role-select → phase progress → verdict → end-to-end events.
  - All Turkish errors and fallbacks covered.
  - Disconnect and reconnect flow included.

---

### Task 4.2: Unit/State/Safety Tests

- `packages/safety/tests/aiOutputFilter.spec.ts`: All known unsafe/good output cases, fallback contract.
- `apps/game-server/src/state/__tests__/roomStateMachine.spec.ts`: Phase/capacity/state corner cases including disconnect/fallback.
- Jury verdict formula unit test.

---

### Task 4.3: Load Tests

- k6 scripts: Simulate ≥100 rooms with 4–8 connected sockets.
- Required: 95th percentile latency <300ms per phase event.

---

### Task 4.4: Data Migration/Seed/Bootstrap Verification

- Run migrations and seed in CI. Must fail if any forbidden content or missing card row.

---

### Task 4.5: Security/Privacy/Error Hardening

- Every socket handler re-validates sessionToken by signature and room.
- Rejects expired/forged token with Turkish error and disconnect.
- No PII is stored—session/nickname only; no external OAuth, no phone, no persistent identifier.
- Output never leaks technical errors; Sentry logs only if configured.
- All server-to-client error events use Turkish main, English fallback only for "Beklenmeyen hata."

---

## Phase 5: Packaging / Deployment / Release

### Task 5.1: Production Build/Deploy

- Build all: `pnpm build` (workspace)
- Frontend to Vercel: `pnpm --filter apps/web deploy`
- Backend to Railway/Fly.io/Render:
  - Build: `pnpm --filter apps/game-server build` (should bundle to `dist/index.js`)
  - Deploy with full `.env` (DB, Redis, AI provider, session secret)
  - Data seed: `pnpm db:seed:cards` is run _before_ go-live.

---

### Task 5.2: Setup/Docs/Automation

- `README.md` must describe all .env vars, migration, seed, dev and prod start flows, and CI acceptance checks.
- `.env.example` is 1:1 with required keys.
- Both `/api/health` and `/health` endpoints must reply with `{"status":"ok"}` for smoke checks.

---

## Validation Matrix for Core Events

| Event                        | Server-Side Validation                                         | On Invalid/Fallback                      |
|------------------------------|---------------------------------------------------------------|------------------------------------------|
| `client:joinRoom`            | Room open, nickname, forbidden/profanity                      | Turkish user error event                 |
| `client:createRoom`          | Code unique, participant cap                                  | Retry/abort, "Oda dolu." etc             |
| `client:selectRole`          | Token, phase, role available, 1 per role                      | Turkish error, only one wins             |
| `client:selectCaseCard`      | Token, phase, valid cardId                                    | Turkish error                            |
| `client:submitCustomTopic`   | Token, phase, ≤140, not forbidden/dup                        | Turkish error, fallback if unsafe        |
| `client:submitStatement`     | Token, phase, right role, 10–140, not forbidden               | Turkish error/fallback as needed         |
| `client:submitFinalWords`    | Token, phase, right role, ≤80, not forbidden                  | Turkish error/fallback                   |
| `client:castJuryVote`        | Token, jury role, only in correct phase, only once            | "Sadece jüri oy kullanabilir." error     |
| `client:sendEmote`           | Token, allowed set/rate-limited/phase                         | Error: rate limit/invalid emote          |

---

## AI Output Filtering / Fallback

_Server pipeline – example code:_

```ts
import { aiOutputFilter } from 'packages/safety/src/aiOutputFilter';

export async function safeAiReply(prompt, context, fallback) {
  const aiResult = await callLlmApi({ prompt, context });
  // AI returns e.g. { role, message_tr, safety }
  const mainText = aiResult?.message_tr || '';
  if (!aiOutputFilter(mainText, 200)) {
    return fallback; // Canonical template: Turkish, safe, short
  }
  return aiResult;
}
```

**Diagram:**

```
[ Phase machine triggers AI ]
        |
      [ call AI (LLM) ]
        |
 [ aiOutputFilter(message_tr, maxLen) ]
       /     \
   safe     unsafe
   |           |
surface     fallback ("Duruşma başlıyor, sessizlik! 🔔")
```

---

## Session Token Validation Example

**At every handler where room/active action occurs:**

```ts
import { verifySessionToken } from '../services/sessionToken';

// Socket.IO handler
io.on('connection', (socket) => {
  socket.on('client:someAction', async (payload) => {
    const { sessionToken } = payload;
    const isValid = verifySessionToken(sessionToken, { roomCode, nickname });
    if (!isValid) {
      socket.emit('server:error', { message: "Geçersiz oturum. Yeniden giriş yapın." });
      return;
    }
    // safe to proceed
  });
});
```

- `sessionToken` is required for all mutating/privileged events (role, statements, voting, emotes, leave, rejoin).
- Token must include roomCode, nickname, and signature; TTL is short-lived (30 min, reset on activity).
- *No* event for join/role/statement sets is processed without token verification.

---

## Room Capacity & Spectator Enforcement Protocol

**At every room join/add handler:**

```ts
const MAX_ACTIVE = 2;
const MAX_SPECTATORS = 6;
const participantCount = room.participants.filter(p => p.status !== 'disconnected').length;
const spectatorCount = room.participants.filter(p => p.role === 'spectator' || p.role === 'jury').length;

if (participantCount >= (MAX_ACTIVE + MAX_SPECTATORS)) {
  socket.emit('server:error', { message: 'Oda dolu.' });
  return;
}
```
**On capacity violation:** emits error, does *not* add participant, locks room from further entry.

---

## Jury Verdict Influence: Contract & Example

**Mathematical Algorithm:**

```
Let AI hakim verdict = N (0–100, davacı side)
Let juryVotes = array of 'davaci' or 'davali'

J_D = davaci votes
J_L = davali votes
If total jury votes == 0: N/100 - N/100
Else:
  jury_ratio = (J_D - J_L) / (J_D + J_L)
  EFFECT = round(jury_ratio * 10) // ±10
  Final D = min(100, max(0, N + EFFECT))
  Final L = 100 - Final D
```

**Implementation Reference (covered in unit tests):**

```ts
function computeJuryInfluencedVerdict(aiDavaciPercent, juryVotes) {
  const J_D = juryVotes.filter(v => v === 'davaci').length;
  const J_L = juryVotes.filter(v => v === 'davali').length;
  const J_TOTAL = J_D + J_L;
  if (J_TOTAL === 0) return [aiDavaciPercent, 100 - aiDavaciPercent];
  const jury_ratio = (J_D - J_L) / J_TOTAL;
  const EFFECT = Math.round(jury_ratio * 10);
  const newDavaci = Math.max(0, Math.min(100, aiDavaciPercent + EFFECT));
  return [newDavaci, 100 - newDavaci];
}
```

**Response struct in verdict event:**

```json
{
  "davaci_percent": 68,
  "davali_percent": 32,
  "ruling_tr": "Davalı haksız! Cezası bir hafta çay almaktır. ☕️",
  "jury_effect": 3,
  "jury_votes": ["davaci","davaci","davali","davaci"]
}
```

---

## Redis/Database/Seed Output Example

After `pnpm db:migrate && pnpm db:seed:cards`:

- Postgres has all tables; case_cards has 18+ Turkish, safe, funny titles.
- Any forbidden/duplicate/unsafe title aborts seed.
- Redis is running; connected on `REDIS_URL`.

---

## Dependency Graph

```
1.1 Workspace Bootstrap
   |
   v
1.2 Data/Persistence Foundation
   |
   v
1.3 App Entry/Bootstrap Flow
   |
   v
1.4 Skeleton UI/Command Surface
   |
   v
-------------------------
| 2.1 Nickname Entry    |
| 2.2 Room Creation     |
| 2.3 Room Join         |
| 2.4 Role Select       |
| 2.5 Case Card/Custom  |
|-----------------------|
         |
         v
   2.6 AI Mübaşir Opening
         |
         v
     2.7 Phase Machine/Deadline
         |
         v
---------------------------
|         3.1 Statement Input      |
|         3.2 AI Lawyers/Hakim    |
|         3.3 Final Words         |
|         3.4 Verdict/History     |
|         3.5 Jury/Emote          |
|         3.6 Presence/Cap        |
|         3.7 Timeout/Disconnect  |
|---------------------------------|
         |
         v
4.1 Integration/E2E Tests
   |
   v
4.2 Unit/Safety/State Tests
   |
   v
4.3 Load Testing
   |
   v
4.4 Data/Seed/Bootstrap Check
   |
   v
4.5 Security/Error Hardening
   |
   v
5.1 Build & Deploy
   |
   v
5.2 Setup/Docs/Health
```

---

**END OF IMPLEMENTATION PLAN.**
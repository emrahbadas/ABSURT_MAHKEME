# 02_ARCHITECTURE.md

> **Absürt Mahkeme**  
> System Architecture — Single Source of Truth

---

## Constraint Alignment

**This architecture strictly implements all locked constraints:**

- **Mobile-first web app only.** No native/mobile features, voice/video, avatars, public matchmaking, user accounts, or payment.
- **Joining = nickname + private 6-character room code.** No accounts, no social login, no profile.
- **Exactly 2 players (davacı, davalı), all other participants (max 6) are spectators/jüri.** All other roles—AI only (mübaşir, hakim, avukatlar).
- **Server-authoritative game state, phase logic, roles, transitions, timers, validation, and AI orchestration.** All on Node.js Socket.IO game server, enforced and exported as contract.
- **Ephemeral state in Redis, completed history in Supabase Postgres.** All data models, contract types, and event schemas are maintained in `/packages/db` and `/packages/shared`.
- **AI and user input must pass forbidden content & safety filter.** AI output is filtered, fallback template is injected if unsafe or invalid.
- **Absolutely forbidden features** (lobbies, profiles, matchmaking, money, uploads, admin, legal realism) are explicitly NOT built, even partially.
- **No duplicate or divergent logic—single source of truth for state, schema, and contract events.**

---

## System Diagram

```
[Mobile Browser]
   │     ─────(read-only REST: /api/health, /api/config, /api/case-cards, /api/rooms/:roomCode/history)─────▶ [Next.js 15 frontend (apps/web)]
   │
   │──────────────────────(wss://game.absurt-mahkeme.[env].com/game)─────────────────────────╮
   ▼                                                                                         │
[Node.js Socket.IO Game Server (apps/game-server)]───────── [AI LLM + Output Filter (packages/safety)]
   │                        │                              │
   │                        │                              └──> Structured + filtered AI output (strictly Turkish/absurd, never personal)
   │                        │
   ├─────────────[Redis (room, phase, timers, jury, session, presence, emote)]
   │
   └─────────────[Supabase Postgres (completed rounds, round summaries, safe curated cards, audit)]
```
**Key:**  
- **No authentication flow**, no file upload, no background job path.  
- **Session is created and mapped to room/participant with opaque session token in Redis.**  
- **All game authority: phase, roles, transitions, timers, validation, input, output, AI orchestration—for all rooms/rules—resides in the dedicated game server.**  
- **No phase, role, or timer logic is in frontend or Next.js routes.**  
- **Frontend REST is read-only; all gameplay via Socket.IO events, session token enforced.**

---

## Monorepo File & Folder Structure

```
absurt-mahkeme/
├── apps/
│   ├── web/
│   │   ├── public/
│   │   └── src/
│   │       ├── app/
│   │       │   ├── page.tsx
│   │       │   ├── layout.tsx
│   │       │   ├── globals.css
│   │       │   ├── room/[roomCode]/page.tsx
│   │       │   ├── room/new/page.tsx
│   │       │   ├── join/page.tsx
│   │       │   └── history/[roomCode]/page.tsx
│   │       ├── components/
│   │       │   ├── NicknameForm.tsx
│   │       │   ├── RoomLobby.tsx
│   │       │   ├── RoleSelector.tsx
│   │       │   ├── CaseCardSelector.tsx
│   │       │   ├── StatementInput.tsx
│   │       │   ├── AIMessageCard.tsx
│   │       │   ├── JuryVotePanel.tsx
│   │       │   ├── EmotePanel.tsx
│   │       │   ├── VerdictCard.tsx
│   │       │   ├── RoundSummary.tsx
│   │       │   ├── LoadingSkeleton.tsx
│   │       │   ├── ErrorAlert.tsx
│   │       │   └── ...
│   │       ├── hooks/
│   │       │   ├── useSocketGame.ts
│   │       │   ├── useRoomState.ts
│   │       │   ├── useNickname.ts
│   │       │   ├── useSessionToken.ts
│   │       │   └── ...
│   │       ├── state/appStore.ts
│   │       ├── utils/copy.ts
│   │       ├── utils/http.ts
│   │       ├── utils/safeRender.ts
│   │       └── types/index.ts
│   ├── game-server/
│   │   ├── src/
│   │   │   ├── index.ts                  # Entry, Socket.IO listener
│   │   │   ├── game/
│   │   │   │   ├── stateMachine.ts       # Phase FSM
│   │   │   │   ├── validation.ts         # Input/output, session/token/forbidden checks
│   │   │   │   ├── aiOrchestrator.ts     # AI orchestration + filtering
│   │   │   │   ├── timers.ts
│   │   │   │   ├── roles.ts
│   │   │   │   ├── roomManager.ts
│   │   │   │   ├── jury.ts
│   │   │   │   ├── emotes.ts
│   │   │   │   └── events.ts             # Event handling/broadcast
│   │   │   ├── api/
│   │   │   │   ├── health.ts
│   │   │   │   ├── config.ts
│   │   │   │   ├── caseCards.ts
│   │   │   │   └── history.ts
│   │   │   ├── redis/
│   │   │   │   ├── client.ts
│   │   │   │   ├── keys.ts
│   │   │   │   └── contract.md
│   │   │   └── supabase/client.ts
│   │   ├── package.json
│   │   └── tsconfig.json
├── packages/
│   ├── shared/
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── room.ts
│   │   │   │   ├── participant.ts
│   │   │   │   ├── round.ts
│   │   │   │   ├── phase.ts
│   │   │   │   ├── caseCard.ts
│   │   │   │   ├── statement.ts
│   │   │   │   ├── ai.ts
│   │   │   │   ├── jury.ts
│   │   │   │   ├── verdict.ts
│   │   │   │   ├── session.ts
│   │   │   │   └── index.ts
│   │   │   ├── constants/colors.ts
│   │   │   ├── constants/forbiddenTopics.ts
│   │   │   ├── constants/phases.ts
│   │   │   ├── data/defaultCaseCards.json
│   │   │   ├── EventSchemas.ts
│   │   │   └── index.ts
│   ├── db/
│   │   ├── src/
│   │   │   ├── schema/
│   │   │   │   ├── rooms.ts
│   │   │   │   ├── participants.ts
│   │   │   │   ├── rounds.ts
│   │   │   │   ├── case_cards.ts
│   │   │   │   ├── statements.ts
│   │   │   │   ├── ai_messages.ts
│   │   │   │   ├── jury_votes.ts
│   │   │   │   ├── verdicts.ts
│   │   │   │   ├── round_summaries.ts
│   │   │   │   ├── safety_checks.ts
│   │   │   │   ├── game_events.ts
│   │   │   │   └── migrations/
│   │   │   ├── README_db.md
│   │   │   ├── client.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── safety/
│   │   ├── src/inputFilter.ts
│   │   ├── src/outputFilter.ts
│   │   ├── src/aiSafeTemplate.ts
│   │   ├── src/aiOrchestrationFlow.md
│   │   └── src/test/input-output.test.ts
├── .github/workflows/ci.yml
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```
**No extra files or unexplained folders.**

---

## Runtime Boundaries & Bootstrap Flow

- **Frontend**: Next.js 15, `apps/web`, App Router only, mobile-first; stateless except tracking sessionToken and nickname.
- **Authoritative Game Server**: `apps/game-server/src/index.ts`. All game logic, phase, validation, AI, timers, and event contracts are enforced here.
- **Shared**: `/packages/shared` for all type defs, events, constants, and safety schema.
- **Safety**: `/packages/safety` for input/output filter logic, fallback templates, test.
- **Redis**: Memory + Redis for all ephemeral state (room, session, phase, deadline, presence, jury, emotes).
- **Supabase Postgres**: For all round results, summaries, audit logs, and safe case card data.
- **All user game state is received from the game server (never Next.js routes). All mutating game events require sessionToken.**

### Bootstrap Sequence

1. User opens `/` route, enters nickname (client + server validation).
2. User creates or joins room (`client:createRoom` / `client:joinRoom` via Socket.IO `/game` namespace).
3. Server validates, creates room, issues `sessionToken`.
4. User receives `{ room, sessionToken }`, proceeds to lobby.
5. All mutating events from user must include `sessionToken` (see event contract).
6. Game phases are strictly driven and enforced by the server FSM (`stateMachine.ts`).
7. Timer/deadline per phase, no client authority for advance or skips.
8. All AI events: output is filtered, fallback if not safe, broadcast only if ok.
9. Results persisted and announced after each round.
10. Disconnect & reconnect handled via `client:rejoinRoom` and sessionToken mapping.

---

## REST API Endpoints (Read-Only, No Auth Needed)

| Method | Endpoint                       | Description                      |
|--------|-------------------------------|----------------------------------|
| GET    | /api/health                   | Health check                     |
| GET    | /api/config                   | Public environment/config params |
| GET    | /api/case-cards               | Safe, curated case cards         |
| GET    | /api/rooms/:roomCode/history  | Recent round summaries (max 10)  |

---

## Socket.IO Event Contract (packages/shared/src/EventSchemas.ts)

### Client → Server Events

| Event                  | Payload TypeScript Interface                               | Requires sessionToken | Notes                                                 |
|------------------------|-----------------------------------------------------------|----------------------|-------------------------------------------------------|
| client:createRoom      | `{ nickname: string }`                                    | No                   | Returns `{ room, sessionToken }`                      |
| client:joinRoom        | `{ nickname: string, roomCode: string }`                  | No                   | Returns `{ room, sessionToken }`                      |
| client:rejoinRoom      | `{ nickname: string, roomCode: string, sessionToken: string }` | Yes             | Reconnect to room/phase                              |
| client:leaveRoom       | `{ sessionToken: string }`                                | Yes                  | Leave immediately; session invalidated                |
| client:selectRole      | `{ sessionToken: string, role: PlayerRole, roomCode: string }` | Yes            | Only if role not taken and room not full              |
| client:selectCaseCard  | `{ sessionToken: string, cardId: string, roomCode: string }` | Yes             | Only in 'lobby' phase                                |
| client:submitCustomTopic | `{ sessionToken: string, text: string, roomCode: string }` | Yes           | Input 1-140 chars, Turkish, forbidden blocklist       |
| client:submitStatement | `{ sessionToken: string, phase: 'claim' \| 'defense', text: string, roomCode: string }` | Yes | 10-140 chars, Turkish, forbidden, valid phase         |
| client:submitFinalWords | `{ sessionToken: string, text: string, roomCode: string }` | Yes | Final words only, ≤80 chars, Turkish, forbidden       |
| client:sendEmote       | `{ sessionToken: string, emojiId: string, roomCode: string }` | Yes            | Only curated, rate-limited                           |
| client:castJuryVote    | `{ sessionToken: string, vote: PlayerRole, roomCode: string }` | Yes           | Jury only, max 1 per round per user                  |

#### Example Payloads

```typescript
// Client
socket.emit("client:submitStatement", {
  sessionToken: "2FN6KD3atX...",
  phase: "claim",
  text: "Cips paketini önce ben açtım, o yüzden son cips benim hakkım!",
  roomCode: "PC90LE"
});
```

**All mutating events are rejected if sessionToken is invalid, expired, or not mapped.**

**If max participant/jury count reached:**
- server responds with `server:error` or disconnects with explanatory payload (see below).

### Server → Client Events

| Event                     | Payload TypeScript Interface                          | Notes                                       |
|---------------------------|------------------------------------------------------|---------------------------------------------|
| server:roomState          | `{ room: Room; phase: RoundPhase; deadlines; currentRoundNumber; participants; [history] }` | Broadcast on every state/phase change       |
| server:phaseChanged       | `{ phase: RoundPhase; deadline: number; triggeredBy: string }` | Trigger on phase switch                     |
| server:deadlineUpdated    | `{ phase: RoundPhase; deadline: number; now: number }` | Countdown update for UI progress            |
| server:participantUpdated | `{ participants: RoomParticipant[] }`                | Participant join/leave, role update         |
| server:aiMessageCreated   | `{ role: AiRole; message: FilteredAiMessage }`       | Always passes outputFilter, else fallback   |
| server:verdictCreated     | `{ verdict: Verdict }`                               | Only after all AI filter/fallback passes    |
| server:roundSummaryCreated| `{ summary: RoundSummary }`                          | At end of round, or /history route          |
| server:error              | `{ code: string; message: string; meta?: any }`      | All errors, Turkish-first, no backend leak  |

---

### Canonical TypeScript Contract Interfaces

**Location:** `/packages/shared/src/EventSchemas.ts`, `/types/` subfolder.

```typescript
// Session-based event: client:submitStatement
export interface ClientSubmitStatement {
  sessionToken: string;
  phase: 'claim' | 'defense'; // Exactly matches server-tracked phase + role ownership
  text: string;      // 10-140 chars, filtered pre-AI
  roomCode: string;
}

export interface ClientSubmitFinalWords {
  sessionToken: string;
  text: string;      // <=80 chars, filtered pre-AI
  roomCode: string;
}

// Room structure
export interface Room {
  code: string;
  status: 'waiting' | 'active' | 'closed';
  participants: RoomParticipant[];
  phase: RoundPhase;
  deadlines: { [phase: string]: number };
  currentRoundNumber: number;
}

// Verdict and AI message contracts
export interface Verdict {
  winner: PlayerRole | null;
  percentages: { davacı: number; davalı: number };
  ruling: string;
  createdAt: string;
  juryEffect: number; // -10 to +10, as applied for jury influence
}

export interface ServerAiMessageCreated {
  role: AiRole;
  message: FilteredAiMessage;
}

export interface FilteredAiMessage {
  text: string; // Turkish, max chars as phase, never personal
  status: 'ok' | 'fallback'; // fallback = template used after unsafe output
  createdAt: string; // ISO
}
```

#### Server error
```typescript
export interface ServerError {
  code: string; // e.g. "SESSION_INVALID", "CAPACITY_FULL", "FORBIDDEN_INPUT"
  message: string; // Turkish-first, no backend detail
  meta?: Record<string, unknown>;
}
```

---

## Session Token Enforcement

- **Session token (`sessionToken: string`) is required for ALL mutating events.**
- **Created by the game server** (never client) and mapped to participant/room via Redis (`session:{TOKEN}` ⇒ { participantId, room }).
- **All event handlers validate:**
  - Is token mapped, not expired (30min max TTL, reset on use)?
  - Does it match the participant's room and phase?
  - Does participant have role/capacity to perform action (active player, jury, etc.)?
- **On invalid/expired token:**
  ```typescript
  socket.emit('server:error', {
    code: "SESSION_INVALID",
    message: "Oturum süresi doldu veya geçersiz."
  });
  // Optionally: socket.disconnect(true) if misbehavior.
  ```
- **If max capacity exceeded (players/jury/room full):**
  ```typescript
  socket.emit('server:error', {
    code: "CAPACITY_FULL",
    message: "Oda kapasitesi dolu veya rol seçilemez."
  });
  ```

---

## AI Output Filtering / Fallback Flow

1. **All user and AI-generated outputs** are STRUCTURED, e.g. `{ text, status, createdAt }`.
2. **AI output (from LLM or template) → is passed through `outputFilter.ts`:**
   - Turkish language, phase-appropriate length, flavor ("absürt"), NOT person-targeting, no forbidden keyword, no serious/real-world legal reference.
   - CONTRACT: If fails, discard, log, substitute from `/aiSafeTemplate.ts` with status = 'fallback'.
3. **Sample type:**
   ```typescript
   export interface FilteredAiMessage {
     text: string;
     status: 'ok' | 'fallback';
     createdAt: string;
   }
   ```
4. **Code sample:**
   ```typescript
   import { outputFilter } from 'packages/safety/src/outputFilter';
   import { getSafeTemplate } from 'packages/safety/src/aiSafeTemplate';
   function createAiMessage(raw: string, phase: RoundPhase): FilteredAiMessage {
     if (outputFilter(raw, phase)) {
       return { text: raw, status: 'ok', createdAt: new Date().toISOString() };
     } else {
       return { text: getSafeTemplate(phase), status: 'fallback', createdAt: new Date().toISOString() };
     }
   }
   ```
5. **Broadcast:** Only filtered/fallback message delivered to clients.

---

## Jury Vote Influence — Technical Algorithm

- **Max ±10% adjustment to AI-calculated haklılık.**
- **Calculation on verdict phase:**
  ```typescript
  function applyJuryEffect(aiDavaci: number, aiDavali: number, jury: JuryVote[]): { davacı: number, davalı: number, juryEffect: number } {
    if (!jury.length) return { davacı: aiDavaci, davalı: aiDavali, juryEffect: 0 };
    const d = jury.filter(v => v.vote === 'davacı').length;
    const l = jury.filter(v => v.vote === 'davalı').length;
    const diff = d - l, count = d + l;
    const effect = Math.round((count ? (diff / count) : 0) * 10); // -10..+10
    let newDavaci = Math.max(0, Math.min(100, aiDavaci + effect));
    return { davacı: newDavaci, davalı: 100 - newDavaci, juryEffect: effect };
  }
  ```
- **In the verdict event (`server:verdictCreated`):**
  ```typescript
  {
    verdict: {
      winner: 'davacı',
      percentages: { davacı: 68, davalı: 32 },
      ruling: "...",
      createdAt: "2024-06-19T09:32:00.000Z",
      juryEffect: +8 // shown as +8% jüri etkisi
    }
  }
  ```
- **Jury cannot override outcome; maximal effect capped, edge cases clamp to [0,100].**

---

## Capacity / Authority Enforcement

- **Each room:**
  - Max 1 'davacı', 1 'davalı' (server-locked).
  - Max 6 spectators/jüri.
- **If `selectRole` or `castJuryVote` attempted when full:**
  - Returns `server:error` with code = "CAPACITY_FULL".
- **If duplicate/replay/invalid action:**
  - Returns `server:error` with code = "FORBIDDEN_INPUT" or "PHASE_INVALID".
- **If session tries action outside authority or during wrong phase:**
  - Returns error event as above, possibly forced disconnect in abusive case.

---

## Redis State Contracts

| Key Pattern                            | Example                | Value / Contents           | TTL                |
|----------------------------------------|------------------------|---------------------------|--------------------|
| session:{TOKEN}                        | session:NpK...         | {participantId,room}      | 30 min (reset)     |
| room:{CODE}                            | room:CB8K6P            | { ...Room }               | 45 min             |
| presence:{CODE}:{PARTICIPANT}          | presence:CB8K6P:uid... | 1/0 (set if connected)    | 2 min              |
| phase_lock:{CODE}:{ROUND}:{PHASE}      | phase_lock:CB8K6P:1:claim | participantId         | phase-time         |
| jury:{CODE}:{ROUND}                    | jury:CB8K6P:1          | JuryVote[] (up to 6)      | 5 min              |
| emote:{CODE}:{ROUND}                   | emote:CB8K6P:1         | EmoteReaction[]           | 2 min              |
| room:deadline:{CODE}:{PHASE}           | room:deadline:CB8K6P:claim | msEpoch                | phase-time         |

**All capacity writes (role pick, jury join, etc.) are atomic via SETNX or SIMWATCH.**

---

## Component APIs — UI Contract Snapshots

| Component         | Props Example                                         | Notes                               |
|-------------------|------------------------------------------------------|-------------------------------------|
| NicknameForm      | `{ onSubmit: (nickname: string) => void }`           | Input, async validate               |
| RoomLobby         | `{ room: Room; onSelectRole: ...; onLeave: ... }`    | Lists slots, disables filled        |
| RoleSelector      | `{ roles: RoomParticipant[], onSelect: ... }`        | Requires server acknowledgement     |
| CaseCardSelector  | `{ available: CaseCard[], onSelect: ...; onCustom: ... }` | Safe custom input               |
| StatementInput    | `{ phase: RoundPhase, onSubmit: ...; disabled: bool }` | User input, filtered, timeout      |
| AIMessageCard     | `{ message: FilteredAiMessage }`                     | Only safe/fallback shown            |
| VerdictCard       | `{ verdict: Verdict }`                               | Always with percentages, juryEffect |
| JuryVotePanel     | `{ enabled: boolean; onVote: (PlayerRole) => void }` | Jury only, locked-out if voted      |
| RoundSummary      | `{ summary: RoundSummary }`                          | Audited, history view               |
| ErrorAlert        | `{ message: string }`                                | Turkish, short                      |

---

## UI/UX Directives and Tokens

All canonical colors in `/packages/shared/src/constants/colors.ts`:

| Name           | Hex        |
|----------------|------------|
| background     | #0F172A    |
| surface        | #1E293B    |
| surfaceElevated| #334155    |
| primary        | #F59E0B    |
| primaryDark    | #B45309    |
| secondary      | #8B5CF6    |
| accent         | #EC4899    |
| success        | #22C55E    |
| warning        | #F97316    |
| danger         | #EF4444    |
| textPrimary    | #F8FAFC    |
| textSecondary  | #CBD5E1    |
| border         | #475569    |

Typography: Inter 600–700 bold, headings 1.4, body 15–17px 1.7; no custom font loader.

UI/UX: All error/success, emote, loading, and empty states as locked in functional spec.

---

## Error Handling Policies

**Client:**
- Receives `server:error` event, always a Turkish-friendly message.
- No error stack, trace, or backend details **ever** in UI.
- All errors mapped by `code` field.
- e.g.  
  ```typescript
  const errorMsg = errorCodeMap[err.code] ?? "Beklenmeyen hata. Sayfayı yenileyin.";
  ```
**Server:**
- Centralized error emission in `apps/game-server/src/game/events.ts`.
- All rejections use shared ServerError contract.

---

## Timer, FSM, and Phase Protocol

1. **State machine (`stateMachine.ts`) defines** all valid phase transitions, time limits, input expectations per phase.
2. On phase entry:
   - Server sets phase deadline (UTC ms), stores in Redis, emits to all clients.
3. If input not received:
   - On phase deadline expiry, server auto-advances, substitutes “Yanıt verilmedi.” in place of missing content.
4. **At no point can client skip, repeat, or force phase change.**
5. All events/actions strictly mapped to the expected role and phase.

---

## Testing

- **Unit/FSM/Filter:** Vitest, `/packages/safety/src/test/input-output.test.ts`
- **E2E:** Playwright `/apps/web/`
- **Load/performance:** k6 against `/socket.io/game` and `/api/`
- **Accessibility (a11y):** axe-core (must pass WCAG 2.1 AA)
- **CI:** `.github/workflows/ci.yml`

---

## Explicitly Out of Scope

_No accounts. No OAuth. No random matchmaking. No public lobbies.  
No native, voice, video, media, files, avatars.  
No admin, moderation, ranking, scoring, payment, realism, file upload, document, or forbidden topics—even partial implementation is prohibited._

---

## Single Source of Truth Recap

**All implementation and documentation must reference:**
- Entry points: `apps/web/src/app/page.tsx` and `apps/game-server/src/index.ts`
- Package, path, and schema: exactly as above—**never diverge or duplicate**
- Runtime: Node.js game server, Next.js frontend, strictly import all shared types/validation contracts from `packages/shared`
- No stateful/game logic in frontend or Next.js API; all in game server and shared packages as the single source of authority

This file is canonical and **MUST NOT BE DEVIATED FROM** for any implementation, schema, naming, or architectural choice.
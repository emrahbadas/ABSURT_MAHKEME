# 06_FULL_SETUP_GUIDE.md

## Absürt Mahkeme — Full Setup Guide

**This single document takes you from an empty machine to a running Absürt Mahkeme MVP.**  
Follows only the authoritative stack:  
- **Monorepo:**  
  - Frontend: Next.js 15 (App Router, React 19, TypeScript)  
  - Backend: Dedicated Node.js (20.x) Socket.IO server (`/game` namespace)  
  - Relational DB: Supabase Postgres (with Drizzle ORM)  
  - State: Redis (ephemeral, authoritative, via shared contract)  
- **Manager:** `pnpm` only  
- **Migrations:** Drizzle (`packages/db`)  
- **No Prisma, no non-TypeScript runtime, no forbidden features, no native mobile code.**

---

## Constraint Alignment

- **Web-only, mobile-first:** Never native, no voice/video/file upload, no lobbies, no public matching.
- **Only nickname + private room code for entry:** No profile, OAuth, email, friend graph.
- **All real-time game logic is server-authoritative:** Timers, role locks, phase changes, AI orchestration — always backend.
- **5-minute, phase-based, AI-augmented court rounds:** Only "davacı" and "davalı" are real, others (hakim, mübaşir, avukatlar) = AI.
- **All environment variables and critical config are documented/canonical.**
- **Forbidden:** Any client-authoritative transitions, public lobby, native code, real money, admin, file upload, legal simulation, or forbidden topic support.

---

## 1. Prerequisites

**Install each tool:**

| Tool        | Version      | Why?| Command/Link                                                        |
|-------------|--------------|-------------------------------|-------------------------------------------------------------------|
| Node.js     | 20.x         | All server/client code        | https://nodejs.org/en/download/                                   |
| pnpm        | ≥8.x, ≤9.x   | Only accepted package manager | `npm install -g pnpm`                                             |
| git         | ≥2.40        | Repository version control    | https://git-scm.com                                               |
| PostgreSQL  | 15.x or 16.x | Local Supabase-style Postgres | https://www.postgresql.org/download/ or your package manager      |
| Redis       | ≥7.x         | Authoritative ephemeral game state | https://redis.io/docs/install/                                |

**Verify installation:**
```bash
node --version     # v20.10.x
pnpm --version     # 8.x or 9.x
git --version      # 2.40+ 
psql --version     # 15.x or 16.x
redis-server --version # 7.x or newer
```

---

## 2. Clone & Install Monorepo

```bash
git clone https://github.com/absurt-mahkeme/absurt-mahkeme.git
cd absurt-mahkeme
pnpm install
```
- **Do NOT use** `npm install` or `yarn` at any point.
- Installs for:
  - `apps/web` (Next.js)
  - `apps/game-server` (authoritative Socket.IO server)
  - `packages/shared`, `packages/db`, `packages/safety` etc.

---

## 3. Environment Variables

### 3.1 Copy Example Files

```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env
cp apps/game-server/.env.example apps/game-server/.env
```

### 3.2 Fill in Canonical Environment Variables

#### Root `.env.example` (copy/paste, then edit as described)

```env
# ───── Database ─────
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/absurt_mahkeme_dev
# For local dev: change db/user/pass/port if your pg config differs.

# ───── Redis ─────
REDIS_URL=redis://localhost:6379/0
# Use Upstash/Redis Cloud URI for prod, keep local for dev.

# ───── Core Secrets ─────
SESSION_SECRET=YOUR_64_CHAR_RANDOM_SECRET
# Generate: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# ───── Environment ─────
NODE_ENV=development

# ───── Ports (local dev, override as needed) ─────
WEB_PORT=3000
GAME_SERVER_PORT=4000

# ───── Supabase ─────
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY= (get from Supabase > Project Settings > API > Service Role Key)

# ───── CORS ─────
CORS_ORIGIN=http://localhost:3000

# Never commit filled .env to git. .env.example is safe.
```
#### `apps/web/.env.example`
```env
NEXT_PUBLIC_GAME_SERVER_URL=http://localhost:4000
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=[copy this from your Supabase dashboard → Project → API → anon public key]
```
#### `apps/game-server/.env.example`
```env
PORT=4000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/absurt_mahkeme_dev
REDIS_URL=redis://localhost:6379/0
SESSION_SECRET=YOUR_64_CHAR_RANDOM_SECRET
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=[copy this from Supabase dashboard → Project Settings → API]
```

**IMPORTANT:**  
- In all environments, keep session/auth token secrets unique and >64 chars.
- For **production**, use generated secure secrets; never use the example or dev values.
- In Vercel/Fly.io/Render/Railway, enter each variable via dashboard; never commit `.env`.

---

## 4. Database Setup (Supabase Postgres w/ Drizzle ORM)

### 4.1 Database: Local Setup

```bash
createdb absurt_mahkeme_dev
# Or (on Windows/git bash):
psql -U postgres -c "CREATE DATABASE absurt_mahkeme_dev;"
```
- If you use Supabase Cloud, skip; DB is provisioned; just copy the connection string from dashboard.

### 4.2 Generate Drizzle Migrations

Migration/seed scripts live under `packages/db`:

```bash
pnpm db:generate    # Compile your current schema into pending migrations
```
- Only necessary after *schema* changes.

### 4.3 Run Migrations

```bash
pnpm db:migrate     # Applies all migrations in `packages/db/migrations`
```
- Ensures all tables/fields defined in Drizzle are in the DB.

### 4.4 Seed Static Data (Curated Absurd Case Cards etc.)

```bash
pnpm db:seed
```
- Loads initial case cards; skip if not needed/migration already did so.

### 4.5 Verify Success

```bash
psql $DATABASE_URL -c "\dt"
# Should list:
# rooms, room_participants, rounds, round_phases, case_cards, case_topics, player_statements, ai_role_messages, jury_votes,
# emote_reactions, verdicts, round_summaries, safety_checks, game_events
```

- **If tables missing:**  
  - Rerun `pnpm db:generate && pnpm db:migrate`
  - Confirm `.env` matches your DB settings.
- Drizzle **never** uses camelCase; all schemas/tables **snake_case**.

---

## 5. Redis Setup

### 5.1 Start Local Redis

```bash
redis-server
# Or using Docker:
docker run --name absurt-redis -p 6379:6379 -d redis:7
```
- DB index (`/0`) must match `REDIS_URL`.

### 5.2 Redis Schema Contract

**All ephemeral room/session/phase state is validated strictly via shared contracts:**
- See: `packages/shared/src/contracts/redisRoomState.ts` and `presenceState.ts`
- Never write arbitrary structures to Redis — always validate with shared contract functions.

To verify contracts compile and are tested:

```bash
pnpm build:types
pnpm test:contracts
```

---

## 6. Development: Start All Apps

### 6.1 One Command for All (Recommended)

```bash
pnpm dev
```
- Starts:
  - **Next.js** at http://localhost:3000  
  - **Socket.IO game-server** at http://localhost:4000

### 6.2 Manual (Separate Terminals)

```bash
pnpm --filter apps/web dev           # http://localhost:3000
pnpm --filter apps/game-server dev   # http://localhost:4000
```

### 6.3 Health/Connection Checks

- **Web:** http://localhost:3000 (should show nickname/room entry)
- **API:** `curl http://localhost:3000/api/health` → `{ "status": "ok" }`
- **Game server Socket.IO `/game` namespace:**

  ```javascript
  // check-socket.mjs
  import { io } from "socket.io-client";
  const socket = io("http://localhost:4000/game", { transports: ["websocket"] });
  socket.on("connect", () => { console.log("✅ Connected!"); process.exit(0); });
  socket.on("connect_error", (e) => { console.error("❌", e); process.exit(1); });
  ```
  Install client:
  ```bash
  pnpm add -D socket.io-client
  node check-socket.mjs
  ```

- **If not connected, double-check all `.env` ports, URLs, and server running state.**

---

## 7. Running Automated Tests

### 7.1 State, Filter, Type Tests

```bash
pnpm test
```
- Runs all Vitest unit/state machine/filter validation suites.

### 7.2 E2E (Simulated Browser, Playwright)

```bash
pnpm test:e2e
```
- App/server must be running.
- For CI/headless: `pnpm test:e2e:ci`

### 7.3 Coverage

```bash
pnpm test:coverage
```

---

## 8. Lint, Format & Type-Check

```bash
pnpm lint
pnpm format
pnpm typecheck
```

---

## 9. Build for Production

### 9.1 Build Frontend (Next.js)
```bash
pnpm --filter apps/web build
# Output: apps/web/.next/
```

### 9.2 Build Game Server
```bash
pnpm --filter apps/game-server build
# Output: apps/game-server/dist/index.js
```

---

## 10. Automated Migration/Seed—Deployment Readiness

### 10.1 Canonical CI Migration Script

Add to CI/CD pipeline before server/app start:

```yaml
- name: Setup Node & pnpm
  uses: actions/setup-node@v3
  with:
    node-version: 20
- run: pnpm install
- name: Apply Drizzle DB Migrations
  run: pnpm db:migrate
- run: pnpm --filter apps/game-server build
- run: pnpm --filter apps/web build
```
- **Never attempt booting apps before DB schema is migrated.**

### 10.2 Table/Field Assert

After migration:

```bash
psql $DATABASE_URL -c "SELECT code FROM rooms LIMIT 1;"   # returns none or value, but table must exist
psql $DATABASE_URL -c "\d+ verdicts;"                    # table list + field schema
```
- **Any error = migration failed; must halt deploy.**

---

## 11. Production Deployment

### 11.1 Vercel (Web - apps/web)

- Connect your repo/project at https://vercel.com/new.
- Set **all** `NEXT_PUBLIC_...` and `SUPABASE_...` keys.
- Output dir: `.next` (default).
- Build command: `pnpm --filter apps/web build`.

### 11.2 Railway/Fly.io/Render (Game Server)

- Set up as **Node.js long-running app**:
  - Entrypoint: `apps/game-server/dist/index.js`
  - Before build/start: always apply migration (`pnpm db:migrate`)
  - Set all required envs: `DATABASE_URL`, `REDIS_URL`, `SESSION_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FRONTEND_URL`, `PORT`
  - Expose port `4000` (or override via env)

### 11.3 Supabase (Postgres)

- Use the prod connection string from Supabase dashboard.
- Always run migration (`pnpm db:migrate`) at deploy time.
- Copy anon/service keys to appropriate `.env`/dashboard fields.

### 11.4 Redis (Cloud)

- Provision with Upstash, Redis Cloud, or similar.
- Enter complete secure connection string in all relevant envs.

---

## 12. Health Checking & Smoke Test (Production & Local)

1. **/api/health endpoint:**  
   `curl [web URL]/api/health` → `{ "status": "ok" }`

2. **Socket.IO connection:**  
   Use the script above to connect to `[app-url]:4000/game` and verify no error.

3. **Room Join / End-to-End:**  
   - Open in two browsers/mobiles, different nicknames, unique room code.
   - Round must progress with role locks, phase transitions, and server-enforced timeouts.
   - Absurd case cards, AI outputs, verdict, summary, jury votes all work.

---

## 13. Complete Environment Variable Reference

| Variable                      | Applies         | Description                                 | Example                                       |
|-------------------------------|-----------------|----------------------------------------------|-----------------------------------------------|
| DATABASE_URL                  | all             | Full Postgres URI (for Drizzle ORM)          | `postgresql://postgres:postgres@localhost:5432/absurt_mahkeme_dev` |
| REDIS_URL                     | all             | Redis server URI                             | `redis://localhost:6379/0`                    |
| SESSION_SECRET                | all             | Server-side session/JWT signing              | `dcf2be6...` (64+ chars, generated)           |
| NODE_ENV                      | all             | `development` or `production`                | `development`                                 |
| SUPABASE_URL                  | all             | Base Supabase API URL                        | `https://xyz.supabase.co`                     |
| SUPABASE_SERVICE_ROLE_KEY     | game-server     | Supabase write-access API key (backend only) | Get from Supabase dashboard                   |
| NEXT_PUBLIC_GAME_SERVER_URL   | web             | For Socket.IO client connection              | `http://localhost:4000`                       |
| NEXT_PUBLIC_SUPABASE_URL      | web             | Exposes correct API URL for browser          |                                              |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | web             | Public anon key (browser safe)               | Get from Supabase API settings                |
| WEB_PORT                      | web             | Port for Next.js app (default: 3000)         | `3000`                                        |
| GAME_SERVER_PORT              | game-server     | Port for Socket.IO server (default: 4000)    | `4000`                                        |
| CORS_ORIGIN                   | game-server     | Allowed browser origin                       | `http://localhost:3000`                       |
| FRONTEND_URL                  | game-server     | For CORS, redirects, etc.                    | `http://localhost:3000` (dev) or prod URL     |

- **Supabase keys:** Dashboard > Project Settings > API
- **Never expose `SUPABASE_SERVICE_ROLE_KEY` on frontend**
- **Never check actual secrets into git**

---

## 14. Common Errors & Solutions

### A. `Error: connect ECONNREFUSED 127.0.0.1:5432`
**Postgres is down or port misaligned.**
```bash
# macOS:
brew services start postgresql@16
# Ubuntu Linux:
sudo systemctl start postgresql
# Windows:
net start postgresql-x64-16
```

### B. `Redis connection refused`
**Redis not running or port mismatched**
```bash
redis-server
# or
docker start absurt-redis
```

### C. `.env variable not set` or `.env missing`
Check for existence and values of `.env`, `apps/web/.env`, `apps/game-server/.env`.

### D. `bind EADDRINUSE`
Port 3000 or 4000 already running.  
Find and kill:
```bash
lsof -i :3000
kill -9 <PID>
```

### E. `Drizzle: "relation ... does not exist"`
Incomplete migration.  
```bash
pnpm db:generate
pnpm db:migrate
```

### F. `Socket.IO client cannot connect`
Environment mismatches, server not up, or wrong CORS.
- Double-check all relevant URLs/ports/envs.
- Confirm game-server terminal output advertises `/game` namespace.

### G. `TypeScript path errors`
- Run: `pnpm build:types`
- Restart IDE/TS server.

---

## 15. Out-of-Scope Enforcement

- No native app packaging, mobile code, video/audio, public lobby, client authority, account system, file upload, admin panel, money integration.
- Never try to enable forbidden MVP features; PM/prod/deployment will block you.

---

## 16. Recovery, Data Integrity, and Health

- Always re-run `pnpm db:generate && pnpm db:migrate` after schema changes before app/server.
- After deploying new migrations:  
  - Run `psql $DATABASE_URL -c "\dt"` to check live tables.
  - Use given health scripts for game-server and Next.js `/api/health`.

---

**You can now play:**
- Visit http://localhost:3000 in multiple windows/devices.
- Join/create, assign roles, play rounds with secure, safe, AI-backed entertainment.
- All runtime authority, safety, and forbidden features are enforced by contract.

---
**Never** implement out-of-scope or forbidden features.

**If anything fails:**  
Re-read the above step-by-step. Checklist:
- All `.env` files correct and secrets filled
- All services running/accessible (`psql`, `redis-server`)
- `pnpm db:generate && pnpm db:migrate` reports no error
- Game server advertises `/game` namespace
- All build/dev/test passes and health endpoints live

---

Absürt Mahkeme setup is complete!  
**System is secure, server-authoritative, and forbidden-feature-safe by design.**
Open, enjoy, and deploy confidently!
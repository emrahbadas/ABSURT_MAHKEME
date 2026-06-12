# Technology Stack

## Decision Summary

| Category              | Chosen                                 | Version         | Key Reason                                                                                          |
|-----------------------|----------------------------------------|-----------------|-----------------------------------------------------------------------------------------------------|
| Monorepo Manager      | pnpm                                   | ^8.7.6          | Fast, disk-efficient, workspace support, locked by contract                                          |
| Frontend Framework    | next                                   | ^15.0.6         | App Router, React 19, Vercel-native, file-based routing, integrates well with SSR/ISR               |
| React                 | react, react-dom                       | ^19.0.0         | Latest stable, App Router compatibility, concurrent features                                         |
| TypeScript            | typescript                             | ^5.4.5          | Strict static typing, large community, enforced by contract                                          |
| Styling               | tailwindcss, autoprefixer, postcss     | ^3.4.1, ^10.4.16, ^8.4.23 | Utility-first, rapid mobile-first design, small runtime, contract-mandated                           |
| State Management      | zustand, tanstack/react-query          | ^4.5.2, ^5.39.5 | Minimal client state; Zustand for ephemeral UI, TanStack Query solely for non-game/read-only REST    |
| Date Handling         | date-fns                               | ^3.6.0          | Tree-shakable, small footprint for minor UI needs                                                   |
| Icons                 | lucide-react                           | ^0.357.0        | Lightweight, customizable, license-compatible                                                       |
| Socket Client         | socket.io-client                       | ^4.7.5          | Matches dedicated Node.js Socket.IO game server, contract-locked for realtime game comms             |
| Backend Runtime       | node                                   | >=18.18.0,<21   | LTS, supported by Vercel and server hosts                                                           |
| Game Server Framework | socket.io, express                     | ^4.7.5, ^4.19.2 | Required for server-authoritative realtime/phase logic                                               |
| ORM                   | drizzle-orm, drizzle-kit, pg           | ^0.29.13, ^0.20.13, ^8.11.4 | Type-safe, migration support, Postgres/PostgreSQL contract-enforced                                  |
| Primary Database      | postgres (Supabase)                    | 15.x (managed)  | Hosted, scalable, cheap, contract-locked, supports realtime APIs and audit/history                   |
| Redis Service         | Redis (Upstash/Redis Cloud)            | 4.x protocol    | Fast ephemeral state service for active room/session/deadlines                                       |
| Redis Client (Server) | ioredis                                | ^5.4.2          | Stable Node.js Redis client for locks, TTL, and atomic room/session operations                       |
| Validation            | zod                                    | ^3.22.4         | Schema-first; both client/server and input/output guards, Typescript-native                          |
| Testing (unit)        | vitest                                 | ^1.6.0          | Vite-compatible, fast, snapshot support, TS-first                                                   |
| Testing (e2e)         | playwright                             | ^1.44.1         | Fast, reliable, supports modern browsers/mobile emulation                                            |
| Load Testing          | k6                                     | ^0.49.0         | Scriptable, socket.io + REST testing, cloud/CLI                                                     |
| Accessibility         | axe-core                                | ^4.8.2          | CI/CLI, a11y rule coverage, contract-locked                                                         |
| Package Manifest      | package.json                           |                 | Cross-stack Node/TS standard; mandatory in contract                                                 |
| Environment           | dotenv                                 | ^16.4.5         | Load .env variables, contract standard                                                              |

> **All libraries pinned; only install from this list. No alternatives nor upgrades outside explicit permission.**

---

## Complete Dependency Files

### Primary dependency manifest: `package.json`

> **This manifest is canonical and exhaustive. Use it for all workspace packages. Versions are locked, magic comments describe workspace roles.**

```jsonc
{
  "name": "absurt-mahkeme",
  "private": true,
  "version": "1.0.0",
  "packageManager": "pnpm@8.7.6",
  "workspaces": [
    "apps/web",
    "apps/game-server",
    "packages/shared",
    "packages/db",
    "packages/safety"
  ],
  "devDependencies": {
    "typescript": "^5.4.5",
    "vitest": "^1.6.0",
    "playwright": "^1.44.1",
    "k6": "^0.49.0",
    "axe-core": "^4.8.2",
    "drizzle-kit": "^0.20.13"
  }
}
```

#### Example app/web `package.json`

```jsonc
{
  "name": "web",
  "version": "1.0.0",
  "private": true,
  "main": "src/app/page.tsx",
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start",
    "test": "vitest run"
  },
  "dependencies": {
    "next": "^15.0.6",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "typescript": "^5.4.5",
    "tailwindcss": "^3.4.1",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.23",
    "lucide-react": "^0.357.0",
    "zod": "^3.22.4",
    "zustand": "^4.5.2",
    "@tanstack/react-query": "^5.39.5",
    "date-fns": "^3.6.0",
    "socket.io-client": "^4.7.5",
    "dotenv": "^16.4.5"
  },
  "devDependencies": {
    "vitest": "^1.6.0",
    "axe-core": "^4.8.2",
    "playwright": "^1.44.1"
  }
}
```

#### Example apps/game-server `package.json`

```jsonc
{
  "name": "game-server",
  "version": "1.0.0",
  "private": true,
  "main": "src/index.ts",
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run"
  },
  "dependencies": {
    "express": "^4.19.2",
    "socket.io": "^4.7.5",
    "zod": "^3.22.4",
    "drizzle-orm": "^0.29.13",
    "pg": "^8.11.4",
    "ioredis": "^5.4.2",
    "dotenv": "^16.4.5"
  },
  "devDependencies": {
    "typescript": "^5.4.5",
    "vitest": "^1.6.0",
    "k6": "^0.49.0"
  }
}
```

#### Example packages/shared `package.json`
```jsonc
{
  "name": "shared",
  "version": "1.0.0",
  "private": true,
  "main": "src/index.ts",
  "dependencies": {
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "typescript": "^5.4.5",
    "vitest": "^1.6.0"
  }
}
```

#### Example packages/db `package.json`
```jsonc
{
  "name": "db",
  "version": "1.0.0",
  "private": true,
  "main": "src/index.ts",
  "dependencies": {
    "drizzle-orm": "^0.29.13",
    "pg": "^8.11.4",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "drizzle-kit": "^0.20.13",
    "typescript": "^5.4.5"
  }
}
```

#### Example packages/safety `package.json`
```jsonc
{
  "name": "safety",
  "version": "1.0.0",
  "private": true,
  "main": "src/index.ts",
  "dependencies": {
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "typescript": "^5.4.5"
  }
}
```

---

### Secondary manifest

Not applicable.  
> There are no alternative runtimes, package systems, or package managers. No language other than TypeScript/JavaScript is used.

---

## Configuration Files (exact content)

### `pnpm-workspace.yaml`
```yaml
packages:
  - apps/web
  - apps/game-server
  - packages/shared
  - packages/db
  - packages/safety
```

---

### `tsconfig.json` (root)

```jsonc
{
  "compilerOptions": {
    "target": "ES2021",
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "esnext",
    "moduleResolution": "node",
    "strict": true,
    "skipLibCheck": true,
    "noImplicitAny": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "incremental": true,
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["packages/shared/src/*"],
      "@db/*": ["packages/db/src/*"],
      "@safety/*": ["packages/safety/src/*"]
    }
  },
  "include": [
    "apps/web",
    "apps/game-server",
    "packages/shared",
    "packages/db",
    "packages/safety"
  ]
}
```

---

### `tailwind.config.js` (for apps/web)

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{ts,tsx,js,jsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#0F172A",
        surface: "#1E293B",
        surfaceElevated: "#334155",
        primary: "#F59E0B",
        primaryDark: "#B45309",
        secondary: "#8B5CF6",
        accent: "#EC4899",
        success: "#22C55E",
        warning: "#F97316",
        danger: "#EF4444",
        textPrimary: "#F8FAFC",
        textSecondary: "#CBD5E1",
        border: "#475569"
      },
      fontFamily: {
        sans: ["Inter", "Arial", "Helvetica", "sans-serif"]
      }
    }
  },
  plugins: []
};
```

---

### `.env.example` (root, for all apps)

```
# --- General ---
NODE_ENV=development

# --- Web App ---
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api
NEXT_PUBLIC_SOCKET_URI=http://localhost:3100/game

# --- Game Server ---
PORT=3100
REDIS_URL=redis://localhost:6379
POSTGRES_URL=postgresql://user:pass@host:5432/dbname

# --- AI & Safety (placeholder for secrets) ---
AI_PROVIDER_API_KEY=yourkey
AI_MODERATION_API_URL=
```

---

## Technology Decisions with Rationale

### Frontend

- **Framework:** `next@^15.0.6`
  - App Router, React 19 support, Vercel-native, mobile-first SSR/ISR, fast routing, enforced by locked stack.
- **Styling:** `tailwindcss@^3.4.1`
  - Utility-first, rapid design alignment, canonical color config aligns with Figma/branding, no heavy UI framework allowed.
- **State management:** `zustand@^4.5.2` (transient UI state), `@tanstack/react-query@^5.39.5` (REST/read-only data)
  - Only minimal UI state client-side; all authoritative game state is server-pushed via Socket.IO.
- **Routing:** `next@^15.0.6` App Router
  - File-based, code splitting, enforced standard, simple dynamic page structure.
- **Forms:** Native React + `zod@^3.22.4`
  - Client only for syntax; every user input is validated again on the game server using the canonical schema.
- **HTTP client:** Native fetch, `socket.io-client@^4.7.5`
  - REST fetch only for config/readonly APIs; all write/game actions via Socket.IO events.
- **Component library:** None; fully custom via Tailwind + own React components.
  - Lightweight, fast first paint, no animation/3D/complex avatar system per contract.
- **Icons:** `lucide-react@^0.357.0`
  - SVG, customizable, no icon bloat, scales for mobile.
- **Date handling:** `date-fns@^3.6.0`
  - Tree-shaking, <10KB for light timestamp/duration formatting.
- **Testing:** `vitest@^1.6.0` (unit/domain), `playwright@^1.44.1` (E2E), `axe-core@^4.8.2` (a11y checks)

### Backend

- **Runtime:** Node.js `>=18.18.0 <21`
  - LTS, low cold starts, Next.js + game server uniformity. No old Node, no Deno/Bun for production.
- **Framework:** `express@^4.19.2` + `socket.io@^4.7.5`
  - Socket.IO unlocked state/messaging, with minimal REST for health/public config only.
- **ORM/Query builder:** `drizzle-orm@^0.29.13`, `drizzle-kit@^0.20.13`, `pg@^8.11.4`
  - Typed schema, migrations in-code, optimized for Postgres/Supabase.
- **Authentication:** None (MVP); temp nickname + signed token, JWT signed in game server, no accounts, enforced via Zod schema.
- **Validation:** `zod@^3.22.4`
  - Schema-defined structures, guards both input and AI output.
- **API documentation:** None in MVP; REST surface is minimal.
- **File uploads:** None for v1 (forbidden).
- **Email:** None for v1 (forbidden).
- **Job queue:** None for v1; phase deadlines/AI orchestrated live in game-server memory+Redis.
- **Testing:** `vitest`, `k6` (for load/latency/scale).

### Infrastructure

- **Database:** Postgres 15.x (managed) via Supabase
  - Cloud managed, serverless API, low admin, audit/history per contract, snake_case, UTC timestamps.
- **Cache:** Redis 4.x (Upstash/Redis Cloud/Elasticache)
  - Used for ephemeral room/session/deadline/presence/locking/state snapshots, no other cache allowed.
- **File storage:** None (file upload forbidden, zero usage).
- **Hosting:**
  - Web: Vercel (Istanbul/Frankfurt region preferred).
  - Game server: Railway/Fly.io/Render (Europe).
  - Supabase: European region for latency/privacy.
  - Redis: Upstash/Redis Cloud, Europe region.
- **CI/CD:** Vercel for web (push to main), Railway/Fly.io/Render for game-server, optional GitHub Actions for safety/test checks.
- **Monitoring:** None for MVP except Supabase dashboards and hosting provider error logs.

---

## Forbidden Alternatives

These were considered and REJECTED. Do not use them:

| Rejected                        | Reason                                                               | Use instead                                 |
|----------------------------------|----------------------------------------------------------------------|---------------------------------------------|
| Yarn or npm                     | Slower, no zero-install/workspaces as efficient                      | pnpm                                        |
| create-react-app, Vite/CRA      | No Next.js App Router, less mobile SSR/ISR support, contract-locked  | next                                        |
| Redux                           | Heavy for simple UI state, excessive boilerplate                     | zustand                                     |
| react-hook-form, formik         | Overkill for low-complexity forms, harder to enforce global schema   | native + zod                                |
| ChakraUI, MUI, Antd, Bootstrap  | Bloated, heavy theming, forbidden animations                        | custom components + tailwindcss             |
| react-icons, heroicons          | Smaller icon set, licensing/bloat                                    | lucide-react                                |
| Moment.js, dayjs                | Larger bundle, timezone/locale issues; Moment deprecated             | date-fns                                    |
| Axios, swr                      | Not needed; native fetch strong enough, react-query only for GET     | fetch, tanstack/react-query (for REST GET)  |
| REST for all state              | No push/pull conflicts, contract: realtime game = socket.io events   | socket.io                                   |
| REST for phase/timeouts         | Forbidden; contract: server-authoritative event model                | socket.io                                   |
| Deno, Bun                       | Immature/unstable for prod; not supported by Vercel/Supabase        | node >=18.18.0 <21                          |
| Prisma, TypeORM, Objection, Knex| Drizzle is type-safe, lighter, contract-mandated                     | drizzle-orm                                 |
| MongoDB, DynamoDB, MySQL, SQLite| Not permitted; relational audit/history schema mandated              | postgres (Supabase)                         |
| Memcached, in-memory cache      | Redis is contract-lock for ephemeral room/session state/cache        | redis                                       |
| File uploads, cloud storage     | Forbidden by contract                                                | None                                        |
| S3, Firebase, GCS               | Not used or needed                                                   | None                                        |
| Passport, Auth0                 | Contract: no long-lived users or third-party login                   | None                                        |
| nodemailer, email services      | Forbidden, not in scope                                              | None                                        |
| Bull, Agenda, Bee queue         | Server does not need queue for phase/timeouts in MVP                 | In-memory + Redis timers in game-server     |

---

**This stack is canonical and must be followed for all development, CI, and documentation. No library, runtime, tool, or manifest may be installed, imported, or referenced except those above.**
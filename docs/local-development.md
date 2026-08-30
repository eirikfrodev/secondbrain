# Local development

Utsikt currently runs entirely in deterministic mock mode. No Supabase, Google, ChatGPT, or provider credentials are required for Phase 0–1.

## Prerequisites

- Node.js 20.9 or newer.
- pnpm 11.0.4 (the version declared by `packageManager`).
- Network access during the first install and clean production build. Next.js downloads Familjen Grotesk and JetBrains Mono through `next/font/google`.
- For Phase 2 database work only: Supabase CLI 2.95.4 and a running Docker-compatible daemon.

## Install and run

```bash
pnpm install
cp .env.example apps/web/.env.local
pnpm dev
```

Open `http://127.0.0.1:3000/today`. The root route redirects to Today.

`CONNECTOR_MODE=mock` is the safe default. Browser interactions are intentionally ephemeral and reset on reload. External and hybrid actions show review/staging states but make no provider call.

## Verification

Run the required checks from the repository root:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm test:visual
pnpm build
```

With the local Supabase prerequisites available, verify migrations and RLS separately:

```bash
pnpm db:start
pnpm db:reset
pnpm db:lint
pnpm db:test
```

`db:start` launches only the disposable local Postgres stack, and `db:reset` applies migrations plus the currently empty seed file. Both commands are local-only. Do not add `--linked`; that would target external state. GitHub CI is configured to run the same database migration and pgTAP checks in disposable containers without project credentials; its first run remains pending.

Playwright uses the workspace-local `.playwright-browsers` directory. On a new machine, install Chromium once:

```bash
PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers pnpm exec playwright install chromium
```

`test:e2e` and `test:visual` each start the web application on `127.0.0.1:3100`; run those two commands sequentially. Visual baselines are platform-specific Chromium PNGs under `tests/e2e/utsikt.spec.ts-snapshots`.

## Current routes

- `/today` — primary attention dashboard and in-place expansion.
- `/week` — load, deadlines, decisions, and drifting work.
- `/month` — consequence-oriented monthly outlook.
- `/item/[id]` — generic stock-block item detail; known fixture UUIDs are supported.
- `/item/meeting` — prepared Gmail/Calendar approval review in mock mode.
- `/item/unknown` — safe unknown-block fallback demonstration.
- `/activity` — Ask and operator-state demonstration.

## Remaining phase placeholders

`pnpm mcp:dev` and the real worker commands intentionally report their owning future phase rather than simulating a working service. They become operational in Phases 3–4.

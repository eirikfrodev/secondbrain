# System architecture and repository structure

> Derived navigation document. `HANDOFF.md` remains canonical.

Use this file while scaffolding the monorepo, worker, connectors, routes, health and concurrency model.

# 4. End-to-end architecture

```text
┌─────────────────────────────────────────────────────────────┐
│ Dedicated ChatGPT “Utsikt Operator” conversation            │
│                                                             │
│ Gmail / Calendar connected apps                             │
│ Relevant recent conversation context                        │
│ Utsikt operator skill                                       │
│ Morning / midday / evening scheduled runs                   │
└──────────────────────────────┬──────────────────────────────┘
                               │ narrow MCP tools
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Utsikt web application                                      │
│ Next.js dashboard + API + remote MCP endpoint               │
│                                                             │
│ Dynamic renderer                                             │
│ Approval UI                                                  │
│ Google OAuth callbacks                                       │
│ Validation and execution-plan creation                       │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Supabase Postgres                                           │
│ Items, revisions, actions, AI jobs, sources, projects,      │
│ operator runs, execution queue, integration accounts, audit │
└──────────────────────────────┬──────────────────────────────┘
                               │ outbound polling / realtime hint
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Mac mini worker                                             │
│ Claims due execution jobs, refreshes tokens, calls providers│
│ Retries safely, records results                             │
│ Later hosts Messages bridge                                 │
└───────────────┬───────────────────────────────┬─────────────┘
                ▼                               ▼
             Gmail API                   Google Calendar API
```

The Mac mini must not require an inbound public port. It polls the execution queue and may subscribe to Realtime as a latency optimisation. Polling is the reliability fallback.

---


# 6. Recommended stack

Use the user's existing preferred stack:

```text
TypeScript, strict mode
Next.js 16, App Router
React
Tailwind CSS 4 + CSS custom properties
Zod at every external boundary
Supabase Postgres, Auth and Realtime
pnpm workspaces
Vitest
Playwright
axe-core for accessibility checks
```

Deployment:

```text
Vercel                 web dashboard, API routes, OAuth callbacks, MCP endpoint
Supabase               Postgres, Auth, RLS, Realtime
Mac mini               long-running TypeScript worker via launchd
Google APIs            Gmail and Calendar execution
```

The app must run in mock mode by default:

```env
CONNECTOR_MODE=mock
```

No Google credentials should be required to see and test the full UI and workflow.

---


# 7. Repository structure

If starting from an empty repository, use:

```text
/
  AGENTS.md
  HANDOFF.md
  INITIAL_CODEX_PROMPT.md
  package.json
  pnpm-workspace.yaml
  turbo.json                     optional; use only if useful
  .env.example

  apps/
    web/
      app/
      components/
      lib/
      public/
      tests/
    worker/
      src/
      tests/
      scripts/install-launch-agent.sh

  packages/
    domain/                      Zod schemas, types, state machines
    db/                          Supabase clients, queries, generated types
    ui/                          tokens, primitives, dynamic block renderer
    connectors/                  interfaces, mock and Google implementations
    operator/                    MCP contracts and mutation validation
    testing/                     deterministic fixtures and connector fakes

  plugin/
    skills/
      utsikt-operator/
        SKILL.md
      utsikt-capture/
        SKILL.md
    README.md
    current-format manifest files generated from official docs

  supabase/
    migrations/
    seed.sql
    tests/

  design/
    boards/
    reference/

  docs/
    implementation-plan.md
    implementation-status.md
    architecture-decisions.md
    risk-register.md
    local-development.md
    deployment.md
    google-oauth.md
    chatgpt-setup.md
    operator-contract.md
    security-model.md
    mac-worker.md
    mac-messages-bridge.md
```

The remote MCP endpoint may live in the Next.js application at:

```text
POST /api/mcp
```

Keep the MCP transport isolated from ordinary browser API routes and require its own authentication.

---


# 11. Worker design

The Mac mini worker is a long-running TypeScript process.

Responsibilities:

- claim due `execution_runs` using an atomic Postgres function with `FOR UPDATE SKIP LOCKED` semantics;
- refresh OAuth tokens;
- call provider connectors;
- retry transient failures;
- persist provider results and audit events;
- update item/action state;
- later host the Messages bridge.

Requirements:

- no inbound public endpoint;
- poll every 2–5 seconds, with Realtime as an optional wake-up hint;
- heartbeat record visible in source health;
- exponential retry for transient failures;
- no retry for validation/auth/permission errors until user intervention;
- graceful shutdown;
- structured logs;
- installable as a macOS `launchd` agent;
- secrets stored in environment/keychain, not the repository.

Provide:

```bash
pnpm worker:dev
pnpm worker:start
pnpm worker:install-launchd
pnpm worker:uninstall-launchd
```

---


# 12. Google connectors

Build provider-independent interfaces first.

```ts
interface EmailConnector {
  resolveSource(input: ResolveEmailSourceInput): Promise<ResolvedEmailSource>;
  ensureReplyDraft(input: EnsureReplyDraftInput): Promise<DraftResult>;
  updateDraft(input: UpdateDraftInput): Promise<DraftResult>;
  getDraft(input: GetDraftInput): Promise<DraftResult>;
  sendDraft(input: SendDraftInput): Promise<SendResult>;
  deleteDraft(input: DeleteDraftInput): Promise<void>;
}

interface CalendarConnector {
  checkAvailability(input: AvailabilityInput): Promise<AvailabilityResult>;
  createEvent(input: CreateEventInput): Promise<EventResult>;
  getEvent(input: GetEventInput): Promise<EventResult>;
  deleteEvent(input: DeleteEventInput): Promise<void>;
}
```

Implement:

```text
MockEmailConnector
MockCalendarConnector
GoogleEmailConnector
GoogleCalendarConnector
```

OAuth requirements:

- server-side authorization-code flow;
- offline refresh token;
- CSRF-safe state and PKCE where supported;
- least-privilege scopes;
- partial-scope handling;
- encrypted token storage;
- reconnect flow for expired/revoked credentials.

The source message must be resolvable exactly before Utsikt offers a reply action. If ChatGPT can only provide sender/subject/time search hints and more than one source matches, show a recovery state instead of guessing.

---


# 18. Routes and APIs

## 18.1 Product routes

```text
/today
/week
/month
/item/[id]
/activity
/settings
/settings/integrations
```

The direct item URL is for deep linking. Normal desktop expansion remains in place on Today.

## 18.2 Browser APIs

```text
GET    /api/dashboard?view=today|week|month
GET    /api/items/:id
POST   /api/items/:id/ask
POST   /api/ask
POST   /api/ai-jobs/:id/cancel
POST   /api/actions/:id/approve
POST   /api/executions/:id/cancel
POST   /api/executions/:id/undo
PATCH  /api/drafts/:externalObjectId
GET    /api/activity
GET    /api/source-health
GET    /api/integrations
GET    /api/oauth/google/start
GET    /api/oauth/google/callback
POST   /api/integrations/google/disconnect
POST   /api/mcp
```

Use generated OpenAPI or equivalent internal documentation for the ordinary API routes.

---


# 19. Source and system health

Clicking the sync status should reveal a lightweight source-health view:

```text
Gmail operator source     synced 08:52
Google execution account connected
Calendar                  synced 08:51
Mac worker                online · 4 s ago
Messages bridge           not configured
Utsikt operator           next 13:00
```

Required visible states:

```text
source disconnected
permission expired
sync delayed
partial sync
source unavailable
item context stale
action payload stale
calendar conflict
draft changed externally
execution failed
operator commit conflict
worker offline
```

Failures need plain-language explanations and recovery actions. Do not rely only on toasts.

---


# 20. Realtime and concurrency

Subscribe to relevant Supabase changes for:

```text
items
item_revisions
actions
ai_jobs
execution_runs
operator_runs
```

Use optimistic UI only for safe internal actions.

Use version-based concurrency:

```text
expected item version
expected item revision
expected operator snapshot version
```

When a user edits or acts after the operator read an item, stale operator commits must be rejected rather than silently overwriting the user's changes.

---


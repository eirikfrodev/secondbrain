# Local development

Utsikt runs in deterministic mock mode by default. No Supabase, Google, ChatGPT, or provider credentials are required for the implemented mock application.

## Prerequisites

- Node.js 22 or newer (required by the current Supabase JavaScript client).
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

Phase 2 also includes a typed in-memory persistence repository behind the same contract as the live adapter. It is process-local, is not presented as durable storage, and never constructs a Supabase client in mock mode.

## Supabase and single-owner Google sign-in

To exercise the implemented live Auth/session boundary against a separately prepared Supabase project, set all five values in `apps/web/.env.local`:

```env
CONNECTOR_MODE=supabase
NEXT_PUBLIC_CONNECTOR_MODE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_replace_me
APP_ORIGIN=http://127.0.0.1:3000
```

`APP_ORIGIN` must be one exact HTTPS origin, or a loopback HTTP origin during local development. It cannot contain a path, query, fragment, or credentials. The browser and server use only the public caller-scoped client. The key must use the low-privilege `sb_publishable_` format; secret, service-role, and legacy JWT-shaped keys are rejected before browser compilation. `SUPABASE_SERVICE_ROLE_KEY` is not read by the web persistence or Auth path. Never commit `.env.local`.

Live mode provides Google-only PKCE sign-in, response-safe cookie mutation, local sign-out, strict verified-session checks, single-owner personal-workspace access, and the `PersistenceRepository` adapter. Until authenticated reads are implemented, protected live pages show an explicit data-pending state and never claim that fixture-only actions were persisted. Browser interaction APIs and Realtime subscriptions are not wired yet. Missing or inconsistent live configuration fails closed instead of falling back to mock.

The repository does not activate a hosted project or contain the real owner address. Before the first live login, complete these reviewed manual steps:

1. Apply the committed migrations to the intended Supabase project through the normal reviewed database workflow. If `auth.users` already contains a user, stop and design a reconciliation procedure; the bootstrap is intentionally for first admission.
2. In the Supabase SQL editor, configure the exact Google account privately. Do not add the address to a migration, seed, issue, log, or committed environment file:

   ```sql
   insert into private.auth_owner_identity (email_normalized)
   values (lower(btrim('<EXACT_GOOGLE_ACCOUNT_EMAIL>')));
   ```

   The empty table rejects every signup. The address can be corrected while unbound; after the first successful login, the address and Supabase user UUID are database-immutable.
3. In Supabase Authentication URL configuration, set the Site URL to the deployed application origin and add the narrow `<APP_ORIGIN>/auth/callback?sb_flow_id=*` redirect pattern. The wildcard is limited to the validated PKCE flow selector; never wildcard the production host or path.
4. In Supabase Authentication Hooks, enable the SQL **Before User Created** hook and select `private.before_user_created`.
5. Configure the Google provider in Supabase Auth. The Google OAuth client's authorized redirect URI is Supabase's provider callback (`https://<project-ref>.supabase.co/auth/v1/callback`), not the application callback from step 3. Keep global signup enabled so the approved Google identity can be created, while the hosted **Email provider**, phone, anonymous, and every other provider remain disabled. Turning off email signup alone is not sufficient for an existing user.
6. Keep Google login consent to identity (`openid`, `email`, `profile`). Do not add offline access, Gmail/Calendar scopes, or provider-token persistence. Phase 4 execution uses separate server/worker credentials and a separate consent lifecycle.

`supabase/config.toml` mirrors the safe local policy: email/anonymous signup and Google are disabled by default, the SQL hook is enabled, and only loopback callback paths with the PKCE flow-selector query are allowlisted. The application additionally requires Google app metadata and an OAuth authentication-method reference in every verified live access token. A developer who performs a manual local Google acceptance test must supply provider credentials only through an uncommitted local configuration. The credential-free automated suite does not call Google.

No hosted migration, Auth setting, owner row, Google credential, or deployment is changed by running the application or its tests.

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

`db:start` launches only the disposable local Postgres stack, and `db:reset` applies migrations plus the currently empty seed file. Both commands are local-only. Do not add `--linked`; that would target external state. GitHub CI runs the same database migration and pgTAP checks in disposable containers without project credentials.

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
- `/sign-in` — single-owner entry; mock mode links back to the credential-free Today preview.
- `/api/auth/google/start` — fixed Google identity OAuth start in live mode.
- `/auth/callback` — fixed PKCE callback in live mode.
- `/auth/sign-out` — POST-only local-session sign-out in live mode.

## Remaining phase placeholders

`pnpm mcp:dev` and the real worker commands intentionally report their owning future phase rather than simulating a working service. They become operational in Phases 3–4.

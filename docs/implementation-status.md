# Utsikt implementation status

Last updated: 2026-09-01.

`HANDOFF.md` remains canonical. This document records implemented and verified behavior, not future intent.

## Current milestone

Phase 0 (Foundation) and Phase 1 (Pixel-faithful dynamic UI) are complete. Phase 2 (Persistence and interaction) is in progress.

The repository now contains a strict pnpm/TypeScript workspace, a Next.js 16 App Router application, shared Zod domain contracts, a generic stock-block renderer, deterministic mock scenarios, reviewed desktop/mobile screens, Supabase SSR/session plumbing, Google-only single-owner admission, live and mock persistence adapters, and automated unit, integration, end-to-end, accessibility, and visual-regression coverage.

## Delivered

### Foundation

- Root pnpm commands for development, production build, lint, type-checking, unit, integration, end-to-end, accessibility, and visual-regression checks.
- Strict TypeScript packages for domain contracts, UI, deterministic fixture loading, and the future worker boundary.
- Credential-free `CONNECTOR_MODE=mock` configuration in `.env.example`.
- Zod schemas for the fixed item envelope, item document v1, all 11 stock blocks, Ask, actions, fixture bundles, and capability policy data.
- Strict executable-action validation and safe per-block fallback parsing for unknown or malformed display blocks.
- Regression tests that parse all seven supplied fixtures.
- Product, security, architecture, risk, implementation, and local-development documentation.

### Dynamic UI

- `/today` with Needs you, In motion, Waiting on others, Handled, schedule, ahead, and drifting context.
- In-place expansion rather than modal navigation.
- `/week` as a consequence/load view and `/month` as an outlook rather than a conventional calendar grid.
- `/item/[id]` generic detail rendering and a prepared external-action approval review.
- `/activity` showing attached Ask instructions, queued/running/done/stuck operator states, and recovery actions.
- A generic renderer for `text`, `quote`, `callout`, `comparison_table`, `slots`, `steps`, `checklist`, `progress`, `draft`, `day_strip`, and `key_value`, plus safe fallback text.
- Keyboard support for `j/k`, `1–3`, `a`, `e`, `z`, `Esc`, and `Cmd/Ctrl+K`; numeric shortcuts focus actions and never execute them.
- Browser-memory mock behavior for Ask queue/cancel, internal completion, alternatives, draft editing, explicit external review, and a cancellable 30-second staging presentation. No provider effect is performed.
- Dedicated 393px Today triage and mobile approval layouts.

### Phase 2 persistence and session foundation — in progress

- Added the first imperative Supabase migration for workspaces/memberships, source evidence, projects, fixed item envelopes, append-only revisions, actions, AI jobs, append-only audit events, and source health.
- Added explicit table grants and membership RLS: anonymous callers have no table access; authenticated callers receive workspace-filtered reads and only narrow transactional mutation functions.
- Bound the current item revision and version through a deferred composite foreign key; bound action and job lineage through composite workspace/item/revision keys; normalized revision/source edges privately so evidence deletion remains safe under concurrency.
- Added transactional functions for revision append, inline/global Ask queue, and idempotent requester-scoped queued-job cancellation. Ask origin, priority, requester, and next-sync time are trusted database values rather than caller inputs.
- Added database JSON Schema validation for the strict item-document envelope and mirrored capability/kind/risk constraints so persisted action authority cannot contradict the domain registry.
- Added 71 passing pgTAP assertions covering schema/RLS shape, isolation, immutable history, stale writes, trusted queue receipts, cancellation, and cross-workspace evidence.
- Added the typed `@utsikt/db` boundary and shared Zod contracts for AI jobs, source health, Ask input, and revision receipts.
- Added a read-only/no-secrets GitHub Actions workflow to run TypeScript/build checks and the disposable local Supabase database suite.
- Kept mock mode as the credential-free default and added fail-closed live-mode configuration. Live mode requires matching server/browser connector flags, a valid Supabase URL, and an `sb_publishable_` key; secret, service-role, and legacy JWT-shaped keys are rejected before browser compilation.
- Added request-scoped browser and read-only server Supabase clients plus a Next.js 16 proxy that refreshes cookies, preserves Supabase private/no-cache response headers, and is not treated as an authorization boundary.
- Added verified-session parsing for issuer, audience, role, authentication assurance, session ID, expiry, and UUID user ID before constructing live persistence.
- Added a Zod-validated Supabase repository for revision append, inline/global Ask queue, queued-job cancellation, and source-health reads. Inputs, database rows, and domain outputs are validated; database failures map to stable non-leaking domain errors while retaining HTTP status for classification.
- Added an explicit process-local mock repository behind the same contract. It constructs no remote client and models workspace isolation, stale revisions, trusted queue receipts, durable cancellation state, and source-health reads.

### Google-only single-owner access

- Added an empty-by-default private owner identity singleton and a Supabase Before User Created SQL hook that admits only one exact privately configured Google email. The address is never seeded or committed.
- Added an independent `auth.users` trigger that rechecks Google-only admission, immutably binds the first Supabase UUID, and atomically provisions exactly one personal workspace, owner membership, source health, and a non-PII audit event.
- Added 46 new pgTAP assertions, bringing the authored database suite to 117 assertions. Coverage includes empty-deny admission, exact email/provider checks, anonymous rejection, hook-bypass defense, duplicate UUID rejection, atomic provisioning, immutable binding, grants, and RLS visibility.
- Added fixed Google identity PKCE routes for start/callback plus POST-only local sign-out. Destinations, scopes, prompt, and callback are code-owned; no caller-selected redirect is accepted.
- Correlated concurrent tabs through bounded Supabase flow IDs, explicitly marked HTTPS cookies `Secure`, and reconstructed exchanged sessions so Google `provider_token` and `provider_refresh_token` fields never reach the final cookie response.
- Required live access tokens to prove a non-anonymous Google identity and an OAuth authentication-method reference before checking the one RLS-visible personal owner workspace.
- Protected Today, Week, Month, Activity, and item routes in live mode. Until authenticated reads are implemented, verified live users see an honest data-pending state instead of fixture data or successful-looking browser-memory actions.
- Added the editorial `/sign-in` interface, accessible pending state, and live-only POST sign-out control while preserving credential-free mock entry.
- Added a synthetic-live Playwright harness with no real credentials or remote calls. It verifies live route wiring, unauthenticated redirects, real installed-SDK PKCE cookies, fixed callback failures, axe results, and desktop/mobile sign-in baselines.

### Browser Ask queue and cancellation boundary

- Added `POST /api/ask`, `POST /api/items/[id]/ask`, and `POST /api/ai-jobs/[id]/cancel` over the existing persistence contract. Queueing returns `201`; queued-job cancellation returns `200` and remains idempotent.
- Added an exact-origin mutation boundary with mandatory `Origin` and Fetch Metadata checks, query/media/encoding rejection, a 16 KiB streaming body cap, strict UUID/JSON schemas, and dependency short-circuiting before session or repository work.
- Derived live user/workspace authority from the verified Google/OAuth session and exactly one RLS-visible personal owner workspace. The caller cannot supply workspace, requester, origin, priority, status, schedule, result, or audit fields.
- Revalidated repository results against request context and returned only a reduced job receipt. Targeted forbidden/missing results collapse to route-specific `404`s, and fixed error envelopes never serialize persistence causes or provider/database details.
- Seeded one process-global mock repository from all seven fixture item UUIDs so local mock API requests can queue and cancel across route bundles without constructing a remote client. Mock mutations return `404` outside loopback development/test and retain at most 256 jobs, so this non-durable state cannot masquerade as deployable persistence.
- Added handler/boundary/context unit coverage, a real mock-repository integration lifecycle, same-origin mock Playwright queue/cancel coverage, and a synthetic-live no-session test that proves there is no mock fallback.

## Verification

The Google-auth/database baseline is verified locally and in GitHub Actions. The current Ask/cancel slice is verified locally on 2026-09-01; its first GitHub run is pending this commit:

| Command | Result |
|---|---|
| `pnpm lint` | pass, zero warnings |
| `pnpm typecheck` | pass across all typed workspace projects |
| `pnpm test` | pass, 284 unit tests |
| `pnpm test:integration` | pass, 4 integration tests |
| `pnpm test:e2e` | pass, 12 mock/synthetic-live functional and accessibility tests |
| `pnpm test:visual` | pass, 9 reviewed Chromium baselines |
| `pnpm build` | pass in default mock and synthetic Supabase modes |
| Database suite | pass, all 117 pgTAP assertions in disposable Supabase |
| GitHub CI `33487197362` | pass, TypeScript/web and disposable Supabase jobs for `acbade3` |

Axe reports no serious or critical violations on Today, the external-action approval flow, or desktop/mobile sign-in. Visual baselines cover Today, expanded item, Week, Month, draft review, Mobile Today, Mobile approval, and live sign-in at 1440px and 393px.

## Intentional implementation notes

- Phase 1 state is deliberately ephemeral and resets on reload. Persistence begins in Phase 2.
- All external and hybrid actions stop at explicit mock review/staging; Gmail, Calendar, arbitrary URLs, SQL, and generated code are never executed.
- The tertiary ink color is slightly darker than the board token to meet WCAG 2.2 AA; see the Deviation section in `docs/architecture-decisions.md`.
- Local Next.js commands use the supported Webpack path because the managed sandbox blocks Turbopack's PostCSS worker transport.
- A clean production build needs network access for the two `next/font/google` assets.
- Git is initialized on `main`, tracks `origin/main` in `eirikfrodev/secondbrain`, and the Google-auth slice is published through commit `acbade3`.
- The Ask/cancel slice is locally complete and not yet pushed. Its HTTP mock store is process-local; the existing page controls remain browser-memory only until real reads provide live item IDs.
- The local machine has Supabase CLI 2.95.4 but no Docker daemon. GitHub Actions successfully applied both migrations to a disposable local database, ran strict database lint, and passed all 117 pgTAP assertions. Nothing has been applied to a hosted Supabase project.
- Both the default mock production build and a synthetic, public-key-only live-configuration build pass locally. The synthetic browser suite targets an unreachable loopback Supabase origin and performs no remote Auth/database action. No hosted Supabase connection or deployment was attempted.

## Not yet implemented

- Hosted activation: applying the migration, privately setting the owner email, enabling the Before User Created hook, enabling Google, disabling the hosted Email/other providers, adding the narrow callback pattern, and manually exercising the approved and rejected real Google accounts.
- Live dashboard/item reads, browser Realtime subscriptions, persisted UI state, UI-to-API wiring, and the real hosted session lifecycle.
- Remote operator MCP and plugin packaging (Phase 3).
- Separate Google Gmail/Calendar execution OAuth, real provider execution, idempotent worker/saga behavior, and launchd setup (Phase 4).
- Scheduled operator setup, deployment, production observability, and final security/manual acceptance (Phase 5).

The next isolated Phase 2 task is authenticated dashboard/item reads. Those reads must provide real database item IDs before the new mutation routes are connected to the current fixture-driven interface.

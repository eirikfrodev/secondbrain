# Utsikt implementation status

Last updated: 2026-08-30.

`HANDOFF.md` remains canonical. This document records implemented and verified behavior, not future intent.

## Current milestone

Phase 0 (Foundation) and Phase 1 (Pixel-faithful dynamic UI) are complete. Phase 2 (Persistence and interaction) is in progress.

The repository now contains a strict pnpm/TypeScript workspace, a Next.js 16 App Router application, shared Zod domain contracts, a generic stock-block renderer, deterministic mock scenarios, reviewed desktop/mobile screens, and automated unit, integration, end-to-end, accessibility, and visual-regression coverage.

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

### Phase 2 persistence foundation — in progress

- Added the first imperative Supabase migration for workspaces/memberships, source evidence, projects, fixed item envelopes, append-only revisions, actions, AI jobs, append-only audit events, and source health.
- Added explicit table grants and membership RLS: anonymous callers have no table access; authenticated callers receive workspace-filtered reads and only narrow transactional mutation functions.
- Bound the current item revision and version through a deferred composite foreign key; bound action and job lineage through composite workspace/item/revision keys; normalized revision/source edges privately so evidence deletion remains safe under concurrency.
- Added transactional functions for revision append, inline/global Ask queue, and idempotent requester-scoped queued-job cancellation. Ask origin, priority, requester, and next-sync time are trusted database values rather than caller inputs.
- Added database JSON Schema validation for the strict item-document envelope and mirrored capability/kind/risk constraints so persisted action authority cannot contradict the domain registry.
- Added pgTAP specifications covering schema/RLS shape, isolation, immutable history, stale writes, trusted queue receipts, cancellation, and cross-workspace evidence.
- Added the typed `@utsikt/db` boundary and shared Zod contracts for AI jobs, source health, Ask input, and revision receipts.
- Added a read-only/no-secrets GitHub Actions workflow to run TypeScript/build checks and the disposable local Supabase database suite.

## Verification

Verified on 2026-08-30:

| Command | Result |
|---|---|
| `pnpm lint` | pass, zero warnings |
| `pnpm typecheck` | pass across all typed workspace projects |
| `pnpm test` | pass, 25 unit tests |
| `pnpm test:integration` | pass, 3 integration tests |
| `pnpm test:e2e` | pass, 7 functional/accessibility tests |
| `pnpm test:visual` | pass, 7 reviewed Chromium baselines |
| `pnpm build` | pass, production routes compiled and prerendered |

Axe reports no serious or critical violations on Today or the external-action approval flow. Visual baselines cover Today, expanded item, Week, Month, draft review, Mobile Today, and Mobile approval at the specified viewports.

## Intentional implementation notes

- Phase 1 state is deliberately ephemeral and resets on reload. Persistence begins in Phase 2.
- All external and hybrid actions stop at explicit mock review/staging; Gmail, Calendar, arbitrary URLs, SQL, and generated code are never executed.
- The tertiary ink color is slightly darker than the board token to meet WCAG 2.2 AA; see the Deviation section in `docs/architecture-decisions.md`.
- Local Next.js commands use the supported Webpack path because the managed sandbox blocks Turbopack's PostCSS worker transport.
- A clean production build needs network access for the two `next/font/google` assets.
- Git is initialized on `main`, tracks `origin/main`, and the verified Phase 0–1 baseline is published at commit `5799296`.
- The local machine has Supabase CLI 2.95.4 but no Docker daemon. A disposable GitHub Actions database job is configured to run the Phase 2 migration/pgTAP suite, but its first successful run is still pending. Nothing has been applied to a hosted Supabase project.

## Not yet implemented

- Phase 2 Auth/session plumbing, live repository adapters, authenticated APIs, browser Realtime subscriptions, persisted UI state, and full browser lifecycle verification.
- Remote operator MCP and plugin packaging (Phase 3).
- Google OAuth, real Gmail/Calendar execution, idempotent worker/saga behavior, and launchd setup (Phase 4).
- Scheduled operator setup, deployment, production observability, and final security/manual acceptance (Phase 5).

The next isolated Phase 2 slice is Auth/session plumbing plus a Supabase repository adapter while retaining the credential-free mock adapter.

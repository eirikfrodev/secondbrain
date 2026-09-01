# Architecture decision record

Material deviations from `HANDOFF.md` must be added here. The handoff remains canonical.

## ADR-001 — pnpm workspace with a Next.js application and shared packages

Status: accepted, 2026-08-30.

Decision: scaffold the recommended repository shape as a pnpm workspace. `apps/web` owns App Router routes and browser interaction. `packages/domain` owns runtime contracts and types. `packages/ui` owns the renderer and visual primitives. Connector, database, operator, testing, and worker boundaries remain separate packages as their phases begin.

Why: domain documents and capability rules must be usable by the web app, worker, tests, and future MCP endpoint without importing browser code. Workspace packages keep those boundaries explicit without adding an unnecessary orchestration framework in Phase 0.

Consequences: TypeScript project references are not required initially; each package exposes source through workspace exports and is checked by the root command. A build orchestrator may be added only when command fan-out or caching creates a demonstrated need.

## ADR-002 — Server-first rendering with one narrow client interaction shell

Status: accepted, 2026-08-30.

Decision: App Router pages remain Server Components and load deterministic mock data directly. A client shell owns focus, expansion, Ask queue, draft edits, alternative actions, and mock execution states.

Why: mock reads need no HTTP round-trip, item data remains plain serializable JSON, and the interactive boundary stays easy to replace with Phase 2 APIs. It also keeps metadata and route composition server-side.

Consequences: no in-memory state is presented as durable. Reloading resets Phase 1 interactions; the UI labels mock execution accurately. Phase 2 replaces the interaction adapter rather than the renderer.

## ADR-003 — Zod is the executable domain contract

Status: accepted, 2026-08-30.

Decision: implement equivalent Zod schemas in `packages/domain` and treat the supplied JSON fixtures as regression vectors. Strict schemas validate fixed envelopes and executable actions. Item blocks are parsed individually so an unknown or malformed block becomes a safe fallback block with its `fallbackText`.

Why: rejecting an entire item because one display block is new conflicts with “degrade, never break,” while permissive action parsing would violate the execution boundary.

Consequences: display parsing and action parsing intentionally have different failure behavior. Unknown display blocks render text and are observable; unknown or malformed executable capabilities are unavailable.

## ADR-004 — Actions are not embedded execution code

Status: accepted, 2026-08-30.

Decision: item documents contain action IDs only. Labels, consequence text, risk, capability, payload, status, and revision binding live in separately validated action records. The Phase 1 UI can demonstrate approval state but cannot call external systems.

Why: the visible document is model-composed content. Separating actions prevents content from becoming authority and allows current-revision, expiry, idempotency, and provider checks at execution time.

Consequences: visual tone is advisory; the capability registry and risk classification determine approval behavior. A numeric keyboard shortcut may focus an external action but never execute it.

## ADR-005 — CSS tokens and semantic class names over document-provided styling

Status: accepted, 2026-08-30.

Decision: use Tailwind CSS 4 for build integration and a curated global component layer for the editorial visual system. Renderer components choose fixed semantic styles. No item field may provide a class name, style declaration, HTML fragment, or script.

Why: the reference is highly specific and benefits from stable shared rules, while free-form utility strings from documents would create both visual drift and an injection boundary.

Consequences: new visual variants require reviewed code. The block grammar can expand through registered renderers, not through arbitrary markup.

## ADR-006 — Month is an outlook, not a calendar grid

Status: accepted, 2026-08-30.

Decision: compose Month from weekly load rows, dated decisions/deadlines, travel/renewal items, drifting projects, and one operator suggestion.

Why: no Month board exists, and the handoff explicitly rejects a conventional month calendar. This structure carries the design grammar forward and answers consequence-oriented questions.

Consequences: visual regression will establish a project-owned Month baseline rather than compare it to a supplied board. Any later design board supersedes this interpretation.

## ADR-007 — Fonts are framework-managed

Status: accepted, 2026-08-30.

Decision: use `next/font/google` for Familjen Grotesk and JetBrains Mono, with system fallbacks.

Why: this matches the design and handoff requirement without checking font binaries into the repository.

Consequences: the first dependency build may need network access to obtain font assets. If the build environment cannot access Google Fonts, a documented fallback or properly licensed local files will be required; unlicensed files will not be bundled.

## ADR-008 — Use the supported Webpack path for local Next.js commands

Status: accepted, 2026-08-30.

Decision: run `next dev --webpack` and `next build --webpack` in this repository.

Why: in the managed local environment, Turbopack's PostCSS evaluator attempts to bind an internal port and is denied by the sandbox. Next.js 16 exposes Webpack as a supported fallback, and it processes the same application, Tailwind, and CSS without that worker transport.

Consequences: local development and verification do not exercise Turbopack. This may be revisited when the managed runtime supports the CSS evaluator or the project no longer needs the fallback.

## ADR-009 — Imperative Supabase migrations with deny-by-default browser access

Status: accepted, 2026-08-30.

Decision: keep one ordered SQL migration history under `supabase/migrations` and make each public table's grants, RLS enablement, and policies part of the same migration as the table. Revoke all `anon` access. Grant `authenticated` only the reads the browser needs; mutations that must update multiple records or enforce concurrency go through narrow transactional functions rather than broad table grants.

Why: Supabase combines PostgreSQL grants and RLS, so a policy alone is not the complete permission boundary. An imperative baseline is reviewable, reproducible with `supabase db reset`, and avoids maintaining a second declarative representation. Transaction functions give Ask, revision, and action state changes one atomic validation/audit boundary.

Consequences: every new exposed table requires explicit allow/deny pgTAP coverage. The service role remains server/worker-only and is not the ordinary browser mutation path. Remote `db push` is not authorised by this decision; schema work is verified locally first and committed separately.

## ADR-010 — Explicit workspace membership and append-only history enforcement

Status: accepted, 2026-08-30.

Decision: add `workspace_memberships` even though the abbreviated handoff table list names only `workspaces`. RLS calls a private, security-definer membership predicate; users can read only their own membership rows. Item revisions and audit events reject updates and deletes with database triggers, and the current item version/revision is protected by a deferred composite foreign key. Revision source arrays are mirrored into a private normalized join table with foreign keys so evidence cannot be concurrently deleted out from under an in-flight revision.

Why: the handoff requires authenticated workspace membership and future personal/work separation; ownership alone cannot represent a work workspace. Relying only on application code for immutable history or matching current revision/version would leave the core concurrency contract unenforced.

Consequences: membership changes are privileged server operations in v0.1. Historical rows cannot be edited by normal application roles. Account deletion and retention will need an explicit, audited administrative procedure rather than cascading ordinary deletes.

## ADR-011 — Capability authority and persisted document contracts are enforced twice

Status: accepted, 2026-08-30.

Decision: keep the capability registry as the TypeScript source of truth for action kind, risk, approval, grace period, and compensation. `ActionSchema` rejects records whose claimed kind or risk contradicts that registry, and the database mirrors the capability/kind/risk combinations with a check constraint. Persisted revision documents are checked with `pg_jsonschema` against the strict version-1 envelope before insertion; individual block payloads remain forward-compatible and degrade through the renderer fallback.

Why: model-composed labels and payloads must never be able to understate execution authority. The authenticated revision function is also an external boundary, so validating only in a future API adapter would allow direct RPC callers to persist documents the shared domain parser rejects.

Consequences: capability additions require one reviewed domain-policy change and a matching migration change. The pgTAP suite tests both mismatched action authority and invalid document envelopes. Unknown or malformed blocks remain display-only content; they never become executable authority.

## ADR-012 — Cookie SSR refresh is separate from data authorization

Status: accepted, 2026-08-31.

Decision: use `@supabase/ssr` with the public project URL and an `sb_publishable_` key for browser and request-scoped server clients. Next config validates live credentials before browser compilation and rejects secret, service-role, and legacy JWT-shaped keys. A Next.js 16 `proxy.ts` is the only current cookie-writing client: it refreshes sessions with `getClaims()` and preserves Supabase's private/no-cache response headers. The server data client is explicitly read-only. The proxy does not redirect or authorize data. Live repository construction verifies the authenticated audience, role, issuer, session ID, and user ID next to the data boundary, and PostgreSQL grants plus RLS remain the workspace authority. No ordinary browser request uses the service-role key.

`CONNECTOR_MODE=mock` and `NEXT_PUBLIC_CONNECTOR_MODE=mock` remain the explicit default. Live mode requires both modes to agree and both public Supabase values to validate; invalid live configuration fails closed. The same `PersistenceRepository` contract has a request-scoped Supabase adapter and a process-local in-memory mock implementation.

Why: proxy checks are optimistic and can be bypassed by direct route or Server Action calls. Keeping verified identity, runtime row parsing, and RLS near persistence avoids turning a refreshed cookie into authorization. A discriminated configuration prevents missing credentials from silently changing a live request into a successful-looking mock operation.

Consequences: mock persistence is deliberately ephemeral and performs no remote effect. The response-aware auth mutation client introduced by ADR-013 is separate from the read-only server data helper; neither weakens the RLS boundary. Ordinary browser interaction APIs, Realtime, and UI state replacement remain separate work. The current Supabase client also raises the project runtime floor to Node.js 22.

## ADR-013 — Google-only admission binds one owner before application access

Status: accepted, 2026-09-01.

Decision: use Supabase Google OAuth with PKCE for application identity only. A private, empty-by-default owner configuration admits one exact normalized Google email through a `before-user-created` SQL hook. An independent `auth.users` trigger rechecks the same boundary, binds the first admitted Supabase UUID immutably, and creates the personal workspace; the existing workspace trigger creates owner membership in the same transaction. Browser callbacks use only the publishable client, accept no caller-selected destination, correlate a bounded flow selector with the exact PKCE verifier, strip upstream provider tokens by reconstructing the Supabase session, validate the authoritative Google user, and require one RLS-visible personal workspace before entering the product. Product pages repeat that server data-access check in live mode and require Google/OAuth claims in the verified access token. HTTPS session cookies explicitly use `Secure`. Sign-out is POST-only, same-origin, and local-session scoped.

Why: an email check in UI or callback code happens after Auth user creation and can drift from database authorization. The hook prevents unwanted signup, while the trigger protects against a missed hosted-hook setting and keeps user/workspace/membership bootstrap atomic. UUID-bound membership remains stable if the Google address later changes. Separating login consent from future Gmail/Calendar consent prevents a simple sign-in from acquiring provider execution authority.

Consequences: the repository never contains the real owner email or a Google login secret. A fresh install rejects every signup until an operator configures the owner privately and enables the reviewed hosted provider/hook/redirect settings. The hosted Email provider—not only signup—plus phone, anonymous, and other social paths remain disabled. The login flow never retains a Google provider token or requests Gmail/Calendar scopes. Deleting or replacing the bound owner requires a separately reviewed administrative procedure. Mock mode remains accessible without Auth or credentials, while live pages remain honestly data-pending until authenticated reads replace fixture projections.

## Deviations

- Accessibility correction, 2026-08-30: `--ink-3` is implemented as `#52657E` rather than the board value `#5E7089`. The board value measures below WCAG AA on both paper tones (approximately 4.39:1 on paper and 4.05:1 on paper-2). The corrected value is approximately 5.19:1 and 4.78:1 respectively while preserving the intended tertiary-blue hierarchy.

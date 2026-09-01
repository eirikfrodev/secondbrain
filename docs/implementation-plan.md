# Utsikt implementation plan

`HANDOFF.md` is canonical. This plan records delivery order and the current implementation choices without narrowing the product contract.

## Invariants

- ChatGPT interprets, recommends and prepares. The user approves. Utsikt executes through allowlisted, validated capabilities.
- The UI renders versioned item documents through stock blocks. It never executes document-provided HTML, JavaScript, CSS, SQL, shell, or arbitrary URLs.
- Items keep a fixed searchable envelope, append-only revisions, separately validated actions, and stable identity.
- Personal and work workspaces remain isolated.
- Mock mode is the default until the full lifecycle works without credentials.
- Phase completion requires the repository commands in `AGENTS.md` to pass and the status document to be updated.

## Phase 0 — Foundation

Status: complete and verified on 2026-08-30.

1. Preserve the handoff, specifications, fixtures, boards, and repository rules as source material.
2. Scaffold a strict pnpm workspace with `apps/web`, `apps/worker`, and shared packages.
3. Add root commands for lint, type-checking, unit, integration, end-to-end, accessibility, and visual checks.
4. Implement `packages/domain` with Zod schemas for the item envelope, every stock block, actions, and fixture bundles.
5. Test every fixture in `specs/fixtures` and test malformed/unknown block degradation.
6. Configure `CONNECTOR_MODE=mock` as the credential-free default.
7. Keep connector, database, operator, and worker packages as typed extension boundaries without beginning external integration work.

Exit criteria:

- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass with no credentials.
- Every supplied fixture validates.
- Unknown blocks produce a safe fallback model rather than a page failure.

## Phase 1 — Pixel-faithful dynamic UI

Status: complete and verified on 2026-08-30.

1. Add the paper/ink/fjord token system, Familjen Grotesk and JetBrains Mono through `next/font`, square geometry, and reduced-motion/focus defaults.
2. Build generic UI primitives for state markers, action hierarchy, Ask, metadata, and the fixed item spine.
3. Build a generic renderer for `text`, `quote`, `callout`, `comparison_table`, `slots`, `steps`, `checklist`, `progress`, `draft`, `day_strip`, and `key_value`, plus unknown-block fallback.
4. Adapt all supplied fixtures into a deterministic mock dashboard model. Add only presentation-level mock records needed for the schedule, handled receipts, weekly load, and month outlook.
5. Recreate `/today`, in-place expansion, `/week`, `/month`, and `/item/[id]` draft/expanded review states. Root redirects to `/today`.
6. Implement the 393px triage layout, direct primary actions, accessible alternatives expansion, and mobile approval flow.
7. Implement `j/k`, `1–3`, `a`, `e`, `z`, `Esc`, and `Cmd/Ctrl+K` without letting a numeric key execute an external action.
8. Implement mock Ask queue, cancellation, internal completion, draft editing, and external grace-period presentation in browser memory. Persistence remains Phase 2.
9. Add Playwright flows, axe checks, and visual baselines at the specified viewports. Compare rendered output to boards `1a`–`1g` and record intentional accessibility corrections.

Exit criteria:

- All stock blocks are exercised; passport renewal has no workflow-specific component.
- Today, expanded, Week, Month, draft review, Mobile Today, and Mobile approval have reviewed screenshots.
- Keyboard and mock lifecycle tests pass.
- Accessibility scans contain no serious or critical violations.
- All six required commands pass.

## Phase 2 — Persistence and interaction

Status: in progress as of 2026-08-31. The schema, RLS, and migration design was explained before implementation.

1. Add a reproducible imperative migration baseline with explicit grants, RLS, membership helpers, append-only revision/audit guards, core indexes, and Realtime publication membership.
2. Add pgTAP tests for schema shape, anonymous denial, workspace isolation, immutable history, and stale-write rejection. Keep database tests separate from credential-free TypeScript tests.
3. Turn `packages/db` into the typed boundary for database rows, repositories, transaction results, and generated Supabase types.
4. Add Supabase Auth/session plumbing and server-side clients without exposing the service-role key to browser code.
5. Implement authenticated dashboard/item reads plus transactional inline/global Ask queue and cancellation APIs. Preserve `CONNECTOR_MODE=mock` as the no-credential fallback.
6. Implement safe internal actions and optimistic concurrency, then replace browser-memory state with persisted state and Realtime subscriptions.
7. Add project/activity/source-health reads and visible recovery states.
8. Prove the complete lifecycle, workspace isolation, stale revisions, cancellation, and append-only history in integration and browser tests.

Previous slice: complete and verified locally and in GitHub Actions on 2026-08-31. It covers step 4 and the repository-adapter boundary needed by step 5.

1. Validate connector mode and browser-safe Supabase configuration without requiring credentials in the default mock mode.
2. Add request-scoped browser/server Supabase clients, Next.js 16 cookie refresh through `proxy.ts`, and a verified-session data-access helper. Proxy refresh is not an authorization boundary; authenticated repository calls and RLS remain authoritative.
3. Implement a Zod-validated Supabase `PersistenceRepository` adapter for the existing transactional functions and source-health read, with stable domain error mapping.
4. Add an explicit in-memory mock repository behind the same interface so credential-free development cannot accidentally construct a Supabase client or perform a remote effect.
5. Cover configuration, session, adapter, response validation, cancellation, and error behavior with unit tests; update architecture, security, and local-development notes.

That slice did not choose a user-facing sign-in method, add browser APIs, replace dashboard state, subscribe to Realtime, change the schema/RLS/migration, link a remote Supabase project, or deploy anything.

Previous slice: Google-only single-owner admission and protected application access, complete and verified locally and in GitHub Actions on 2026-09-01.

1. Keep Supabase Google sign-in limited to identity (`openid`, `email`, and `profile`). Future Gmail/Calendar authorization remains a separate Phase 4 consent and token lifecycle.
2. Add a default-deny PostgreSQL `before-user-created` hook backed by private owner configuration. Admit only the exact configured Google email, bind the first admitted Auth UUID immutably, and never commit the address to the repository.
3. Provision exactly one personal workspace and its existing owner membership atomically with first-user creation. Add pgTAP coverage for missing configuration, wrong email/provider, duplicate ownership, and idempotent workspace state.
4. Disable email signup in local Supabase configuration and document the hosted Google provider, narrow flow-selector callback pattern, Auth-hook selection, complete Email-provider shutdown, and private owner configuration steps. Do not link or change a hosted project from this slice.
5. Add a fixed-destination PKCE start/callback flow, response-owned auth cookie handling, authoritative callback validation, POST-only same-origin local sign-out, and stable non-leaking failure messages.
6. Protect product routes at the server data-access boundary in Supabase mode while preserving credential-free mock mode. Proxy continues to refresh sessions only; RLS and owner membership remain authoritative.
7. Cover callback validation, cookie/header preservation, route access, sign-out, and the sign-in interface without real Google credentials.
8. Keep authenticated live pages explicitly data-pending until real reads exist, and run a separate synthetic-live Playwright harness for route wiring, unauthenticated redirects, Google-start cookie/PKCE behavior, accessibility, and desktop/mobile sign-in baselines.

Non-goals: no password, magic-link, anonymous, or alternate-provider sign-in; no caller-selected callback or post-login URL; no Gmail/Calendar scopes or provider-token persistence; no service-role key in the web app; no hosted Supabase/Google changes, deployment, Realtime wiring, or production data migration.

Current slice: authenticated Ask queueing and queued-job cancellation HTTP boundary.

1. Add strict route-owned contracts for `POST /api/ask`, `POST /api/items/[id]/ask`, and `POST /api/ai-jobs/[id]/cancel`. Callers may provide only the bounded instruction or path UUID; workspace, user, origin, status, timing, and result fields remain trusted server/repository data.
2. Reject non-exact origins, cross-site fetches, query strings, wrong content types, oversized bodies, malformed JSON, unknown keys, and non-UUID path IDs before constructing a live Supabase client or invoking the repository.
3. In Supabase mode, require the verified Google session and single personal-owner workspace before creating the caller-scoped repository. In mock mode, use one capped process-local seeded repository behind the same interface, enable it only for loopback development/test, and perform no remote call.
4. Return only Zod-validated AI-job receipts with private no-store and `nosniff` headers. Map persistence failures to stable status/code pairs without leaking database/provider causes.
5. Prove queue/cancel/idempotent-cancel behavior, session/workspace isolation, invalid-state handling, transport limits, and error redaction with unit, integration, and credential-free browser tests.

Non-goals: no table/schema-shape, RLS-policy, Auth-provider, GitHub Actions, hosted-service, or deployment changes; no arbitrary tool execution; no external provider effect; no live dashboard reads, Realtime subscription, or fixture-UI wiring. The existing pages stay honest and data-pending in live mode because their mock item IDs are not database identities.

Completed corrective follow-up: a narrow additive RPC-signature migration makes item Ask and cancellation receive the API-resolved personal workspace ID and enforce it atomically with the target lookup. Execute access and definitions for the older unscoped overloads are removed, existing RLS/Auth rules remain unchanged, and pgTAP proves that a personal-workspace owner who also belongs to another workspace cannot mutate the non-resolved workspace. This is a compatibility/security correction to the current slice, not a new product phase.

After this slice is independently green and committed, the next safe Phase 2 increment is authenticated dashboard/item reads, followed by wiring these endpoints to live item identities. Each remains a separate commit and must not widen the external-effect boundary.

## Phase 3 — Operator MCP and plugin

Status: planned.

- Add a separately authenticated remote MCP endpoint with narrow read/write schemas.
- Implement transactional begin/commit, snapshot conflict detection, capture, and queue tools.
- Package the operator and capture skills using the then-current official format.
- Confirm no operator tool can execute an external provider action.

## Phase 4 — Google execution

Status: planned; credentials will be needed for manual acceptance.

- Explain OAuth, provider data, and any persistence changes before implementation.
- Implement connector interfaces, separate Google execution OAuth, encrypted tokens, Gmail draft lifecycle, Calendar availability/events, execution queue, 30-second grace period, idempotency, saga recovery, and the polling worker.
- Keep real accounts opt-in; automated tests use connector fakes.

## Phase 5 — Scheduled operator and hardening

Status: planned.

- Add operator setup, deployment and worker documentation, audit/activity UX, source-health recovery, production observability, and full manual acceptance.
- Do not deploy to production without the exact approval phrase required by repository policy.

## Phase 6 — Later

Status: backlog only.

- Messages bridge, Microsoft Graph, Shortcut/share sheet, event-triggered runs, reviewed custom renderers, and sandboxed mini-interfaces.

## Immediate build sequence

1. Complete Phase 0 documentation and scaffold.
2. Validate fixtures through shared schemas.
3. Build the server-rendered layout and generic block renderer.
4. Add the interaction shell and responsive views.
5. Run browser inspection and tune against the boards.
6. Complete every Phase 0/1 verification command and update status.

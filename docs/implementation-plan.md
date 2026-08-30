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

Status: in progress as of 2026-08-30. The schema, RLS, and migration design was explained before implementation.

1. Add a reproducible imperative migration baseline with explicit grants, RLS, membership helpers, append-only revision/audit guards, core indexes, and Realtime publication membership.
2. Add pgTAP tests for schema shape, anonymous denial, workspace isolation, immutable history, and stale-write rejection. Keep database tests separate from credential-free TypeScript tests.
3. Turn `packages/db` into the typed boundary for database rows, repositories, transaction results, and generated Supabase types.
4. Add Supabase Auth/session plumbing and server-side clients without exposing the service-role key to browser code.
5. Implement authenticated dashboard/item reads plus transactional inline/global Ask queue and cancellation APIs. Preserve `CONNECTOR_MODE=mock` as the no-credential fallback.
6. Implement safe internal actions and optimistic concurrency, then replace browser-memory state with persisted state and Realtime subscriptions.
7. Add project/activity/source-health reads and visible recovery states.
8. Prove the complete lifecycle, workspace isolation, stale revisions, cancellation, and append-only history in integration and browser tests.

Current slice: steps 1–3. No remote Supabase project is linked and no migration will be applied outside the local development stack.

## Phase 3 — Operator MCP and plugin

Status: planned.

- Add a separately authenticated remote MCP endpoint with narrow read/write schemas.
- Implement transactional begin/commit, snapshot conflict detection, capture, and queue tools.
- Package the operator and capture skills using the then-current official format.
- Confirm no operator tool can execute an external provider action.

## Phase 4 — Google execution

Status: planned; credentials will be needed for manual acceptance.

- Explain OAuth, provider data, and any persistence changes before implementation.
- Implement connector interfaces, Google OAuth, encrypted tokens, Gmail draft lifecycle, Calendar availability/events, execution queue, 30-second grace period, idempotency, saga recovery, and the polling worker.
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

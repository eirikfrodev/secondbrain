# Delivery phases, tests and definition of done

> Derived navigation document. `HANDOFF.md` remains canonical.

Use this file to sequence implementation and determine whether a phase is genuinely complete.

# 22. Deterministic seed scenarios

Seed mock mode with these items.

## A. Meeting email

Anders asks whether Thursday 14:00 or Friday 10:00 works.

Expected:

- Thursday recommended;
- source quote;
- calendar evidence;
- editable draft;
- alternative response;
- `Find other times` AI action;
- optional reply-and-calendar hybrid action.

## B. Copenhagen hotels

Three alternatives:

1. Hotel Sanders — recommended;
2. Villa Copenhagen;
3. Manon Les Suites.

Expected:

- comparison table;
- reasoning callout;
- choose internally;
- compare alternatives;
- find cheaper AI action;
- no booking capability.

## C. Waiting for architect

Revised estimate promised Tuesday and now three days late.

Expected:

- follow-up draft;
- wait until Monday;
- mark resolved.

## D. Passport renewal

Expected blocks:

- steps;
- callout;
- slots;
- checklist;
- external appointment proposal;
- Ask.

No workflow-specific React component.

## E. Athens research in progress

Expected:

- working state;
- progress;
- source/provenance;
- no premature result actions.

## F. Password-protected PDF

Expected:

- danger square;
- plain-language failure;
- recovery actions.

## G. Kitchen water filter resurfacing

Expected:

- project reference;
- last activity;
- reassess;
- find best system;
- drop project.

---


# 23. Implementation phases

## Phase 0 — Foundation

Deliver:

- repository scaffold;
- root `AGENTS.md`;
- source design assets in place;
- shared domain schemas;
- initial docs and risk register;
- lint, type-check and test commands;
- mock-mode environment.

Exit criteria:

- all commands run;
- no secrets required;
- domain schemas have unit tests.

## Phase 1 — Pixel-faithful dynamic UI

Deliver:

- Today, expanded item, Week, Month, draft review and mobile views;
- renderer for every stock block;
- seed scenarios;
- keyboard navigation;
- responsive behaviour;
- visual regression screenshots.

Exit criteria:

- close visual match to boards 1a–1g;
- unknown blocks degrade safely;
- passport scenario uses only generic blocks;
- accessibility scan passes without serious violations.

## Phase 2 — Persistence and interaction

Deliver:

- Supabase schema and RLS;
- Auth;
- items, revisions, actions, AI jobs, projects, activity;
- inline/global Ask;
- internal action approval;
- Realtime updates;
- source-health states.

Exit criteria:

- user can queue an instruction, see it update in real time and cancel it;
- item revisions remain append-only;
- workspace isolation tests pass.

## Phase 3 — Operator MCP and plugin

Deliver:

- authenticated remote MCP endpoint;
- read/write tools;
- operator and capture skills;
- current-format plugin packaging;
- manual operator test that updates the dashboard.

Exit criteria:

- MCP inspection passes;
- stale batch commit is rejected;
- ordinary ChatGPT conversation can capture an open loop;
- no tool can execute an external provider action.

## Phase 4 — Google execution

Deliver:

- OAuth connection UI;
- Google connectors;
- Gmail draft creation/update;
- delayed send/cancel;
- Calendar availability and event creation;
- hybrid saga;
- worker and launchd installation.

Exit criteria:

- test account can create one real reply draft;
- choosing another response updates the same draft;
- user can schedule send, cancel inside 30 seconds, and send once;
- event creation is idempotent;
- partial hybrid failure is represented accurately.

## Phase 5 — Scheduled operator and hardening

Deliver:

- ChatGPT setup documentation;
- morning/midday/evening task prompts;
- production deployment;
- security review;
- audit view;
- error recovery and observability;
- complete end-to-end manual test.

Exit criteria:

- one scheduled run reads sources and updates Utsikt;
- user approves an action and Utsikt executes it;
- source evidence and audit trail remain visible;
- all test suites pass.

## Phase 6 — Later

Plan, but do not block v0.1 on:

- SMS/iMessage Mac bridge;
- Microsoft Graph;
- iOS Shortcut/share sheet;
- event-triggered operator runs;
- registered custom renderers;
- optional sandboxed mini-interfaces.

Proceed sequentially and keep `/docs/implementation-status.md` current. Do not pause between phases unless blocked by credentials or an irreversible decision.

---


# 24. Testing

## 24.1 Unit tests

Cover:

- all Zod schemas;
- unknown-block fallback;
- item-state transitions;
- stable-key deduplication;
- action risk classification;
- action expiry and stale revision;
- idempotency;
- grace-period calculation;
- compensation eligibility;
- timezone parsing;
- workspace isolation helpers;
- source-resolution rules.

## 24.2 Integration tests

Cover:

- operator begin/commit;
- stale operator commit;
- MCP schemas and authentication;
- AI job queue/cancellation;
- Gmail draft create/update with mock and test account;
- external draft change;
- delayed send/cancel;
- duplicate approval click;
- Calendar event create/delete;
- Calendar conflict;
- hybrid partial failure;
- revoked OAuth token;
- worker claiming and retries.

## 24.3 End-to-end tests

Playwright scenarios:

1. Today renders seeded state.
2. `j/k` changes focus.
3. Item expands in place.
4. Ask creates a queued job.
5. Cancel removes queued job.
6. Internal recommended action completes.
7. Draft review is editable.
8. External action enters grace period.
9. User cancels during grace period.
10. Mobile alternative sheet works.
11. Week and Month render correctly.
12. Realtime operator update appears without reload.
13. Unknown block renders fallback.
14. Stale action displays recovery state.

## 24.4 Visual regression

Create baselines for:

```text
1440 Today
900 expanded item
1440 Week
1440 Month
900 Draft review
393 Mobile Today
393 Mobile approval
```

Compare with the supplied boards. Accessibility-driven colour corrections are allowed; generic visual drift is not.

---


# 25. Observability and activity

Structured logs for:

```text
operator run start/commit/failure
MCP calls
item create/update/archive
AI job transitions
action approval
execution scheduling/cancellation
provider execution
compensation
OAuth refresh failure
version conflict
unknown block
worker heartbeat
```

`/activity` should show a human-readable audit trail:

```text
08:52  Operator updated “Anders — Thursday or Friday?”
08:53  Gmail draft created
09:01  You approved Thursday 14:00
09:01  Sending scheduled for 09:01:30
09:01  You cancelled the send
```

Add Sentry or equivalent only if credentials are available; do not block local development.

---


# 26. Required commands

The repository must support:

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm test:visual
pnpm db:reset
pnpm db:seed
pnpm mcp:dev
pnpm worker:dev
pnpm worker:start
pnpm worker:install-launchd
```

Provide `.env.example` with mock-mode defaults and explanatory comments.

---


# 27. Definition of done

v0.1 is complete when:

- the main views closely match the high-fidelity design;
- desktop and mobile interactions work;
- items are server-composed JSON documents, not hardcoded workflow cards;
- unknown block types cannot break the UI;
- item history is append-only;
- inline/global Ask produces AI jobs;
- actions are dynamic but execute through an allowlisted capability registry;
- mock mode demonstrates the complete lifecycle;
- Supabase Auth, RLS and workspace isolation pass tests;
- remote MCP tools work from ChatGPT;
- an ordinary conversation can capture a durable open loop;
- a manual operator run can update Utsikt;
- scheduled-run setup is documented and tested;
- Gmail reply draft creation works with a test account;
- delayed sending can be cancelled before execution;
- Calendar event creation is idempotent;
- partial execution failures are explicit;
- source evidence and audit history are visible;
- arbitrary model-generated HTML/JS is never executed;
- no scheduled operator run can directly cause an irreversible external effect;
- production and Mac worker setup are documented;
- all required tests pass.

At completion, return:

1. concise implementation summary;
2. architecture diagram;
3. exact local run instructions;
4. exact deployment instructions;
5. manual Google and ChatGPT setup steps;
6. known limitations;
7. screenshots of key states;
8. security review summary;
9. prioritised v0.2 plan.

---


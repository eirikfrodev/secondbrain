Build Utsikt from the repository handoff.

First read HANDOFF.md, AGENTS.md, design/reference/README.md and inspect design/boards/1a.png through 1h.png. Inspect any existing repository before changing it.

Do not code immediately. First create:
- docs/implementation-plan.md
- docs/architecture-decisions.md
- docs/risk-register.md

Then implement Phase 0 and Phase 1 completely: scaffold the repo if needed, create the shared domain schemas, build the dynamic item renderer, and recreate Today, expanded item, Week, Month, draft review and mobile views using deterministic mock data. Use browser inspection and Playwright screenshot comparison against the supplied boards. Do not create workflow-specific cards and do not execute arbitrary generated HTML.

After Phase 1 passes lint, type-checking, unit tests, accessibility checks, end-to-end tests and visual regression, continue sequentially through the remaining phases in HANDOFF.md. Keep docs/implementation-status.md current, make coherent commits, and do not stop for broad clarification unless blocked by credentials or an irreversible architectural conflict.

The most important product rule is: ChatGPT interprets, recommends and prepares; the user approves; Utsikt executes deterministically.

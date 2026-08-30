# Utsikt risk register

Likelihood and impact use low / medium / high. Owners are implementation areas rather than people.

| ID | Risk | Likelihood | Impact | Mitigation and evidence | Owner / phase |
|---|---|---:|---:|---|---|
| R-01 | Model-composed content crosses into executable HTML, styles, URLs, SQL, or code. | medium | high | Zod-owned stock blocks, no raw markup rendering, registered components only, unknown blocks reduced to text, capability allowlist. Unit and E2E fallback tests. | Domain/UI, Phase 0–1 |
| R-02 | A visually presented action is treated as execution authority. | medium | high | Documents carry IDs only; actions are separately validated against capability, risk, revision, expiry, account, and idempotency before approval. Domain and database constraints reject kind/risk claims that contradict the capability registry. Phase 1 never performs external effects. | Domain/actions, all phases |
| R-03 | A fixture conflict causes implementation shortcuts to overwrite the canonical contract. | medium | medium | `HANDOFF.md` remains first priority. Record material interpretations/deviations as ADRs; keep fixtures as regression inputs rather than generated truth. | Architecture, all phases |
| R-04 | Dynamic blocks are too strict and one malformed block breaks an item or page. | medium | high | Parse the document envelope and blocks separately, preserve safe `fallbackText`, return observable fallback render models, and test unknown/malformed blocks. | Domain/UI, Phase 0–1 |
| R-05 | Dynamic blocks are too permissive and unsafe executable data slips through. | medium | high | Strict action schemas and capability-specific payload validation; display fallback applies only to content blocks, never actions. | Domain/actions, Phase 0 onward |
| R-06 | The UI drifts into rounded SaaS cards or a miniature calendar/task manager. | medium | medium | Screenshot baselines at exact viewports, board-by-board review, square token primitives, no shadows/gradients, consequence-oriented Week/Month. | UI, Phase 1 |
| R-07 | Metadata is too small or low-contrast to meet WCAG 2.2 AA. | medium | high | Use the handoff's corrected ink-2/ink-3 values, minimum readable metadata sizes, axe scans, keyboard-only walkthrough, and explicit state labels. Accessibility corrections outrank pixel matching. | UI/testing, Phase 1 |
| R-08 | Keyboard shortcuts trigger an external action unexpectedly. | low | high | Numeric shortcuts select/focus only; external actions open a review state. Require an explicit button press for approval and test this path. | Interaction, Phase 1+ |
| R-09 | Mobile becomes a compressed desktop and loses usable tap targets. | medium | medium | Dedicated 393px triage composition, direct primary action, 44px minimum targets, alternatives disclosure, mobile screenshots and touch-flow E2E. | UI, Phase 1 |
| R-10 | Browser-memory mock behavior is mistaken for durable state. | medium | medium | Label mock mode in development, never claim persistence, keep state adapter replaceable, and document reload behavior until Phase 2. | UI/docs, Phase 1 |
| R-11 | Workspace data leaks across personal/work boundaries. | low | high | Workspace IDs on all envelopes/actions, server-side membership constraints, RLS on exposed tables, isolation tests before Phase 2 completion. No Phase 1 mixing logic. | DB/auth, Phase 2 |
| R-12 | Item updates overwrite history or race with user actions. | medium | high | Append-only revisions, current-revision pointers, expected versions, transactional operator commits, and stale-action rejection tests. | DB/operator, Phase 2–3 |
| R-13 | Duplicate approval or worker retries cause duplicate sends/events. | medium | high | Unique idempotency keys, atomic claims, provider object tracking, pre-execution rereads, and retry classification. | Execution/worker, Phase 4 |
| R-14 | Email or calendar content contains prompt-injection instructions. | high | high | Treat all sources as untrusted evidence in skills and schemas; backend independently validates all effects; never expose broad provider tools. | Operator/security, Phase 3–5 |
| R-15 | OAuth credentials or message bodies leak to browser, logs, MCP, or repository. | low | high | Server-only encrypted tokens, redacted structured logging, safe error models, `.env.example` without values, and security review. | Connectors/security, Phase 4–5 |
| R-16 | Gmail source resolution chooses the wrong thread or draft. | medium | high | Require exact resolution before reply capability, track external IDs and content hashes, stop visibly on ambiguity/external changes. | Gmail connector, Phase 4 |
| R-17 | Calendar availability changes between recommendation and approval. | medium | high | Recheck immediately before execution, bind timezone and revision, surface conflict as `stuck` with recovery actions. | Calendar connector, Phase 4 |
| R-18 | A hybrid email/calendar workflow partially succeeds but looks complete. | medium | high | Persist saga steps, expose exact partial results, offer only real recovery/compensation, test partial failure. | Execution, Phase 4 |
| R-19 | The 30-second send grace period is described as provider recall. | low | high | Schedule before provider submission; show Cancel only while local execution is pending; show Undo only for genuine compensation. | Execution/UI, Phase 4 |
| R-20 | Mac worker is offline and jobs silently stall. | medium | high | Polling fallback, heartbeat/source health, retry policy, visible worker-offline/stuck states, launchd docs. | Worker, Phase 4–5 |
| R-21 | Framework or dependency churn breaks the scaffold. | medium | medium | Pin compatible major versions, commit lockfile, strict CI-equivalent local commands, isolate framework code from domain contracts. | Foundation, Phase 0 |
| R-22 | Google-hosted fonts are unavailable during build. | low | medium | Framework-managed fonts with system fallbacks; document build-network requirement; never copy unlicensed binaries. | Web/build, Phase 0–1 |
| R-23 | Production is deployed before security and credential setup are reviewed. | low | high | No production deployment without the repository's exact approval phrase; mock mode remains default. | Release, Phase 5 |

## Current watch list

- R-04/R-05: prove asymmetric parsing—lenient visual fallback, strict executable actions—before UI work expands.
- R-06/R-07/R-09: assess together during Playwright screenshot and axe passes.
- R-21/R-22: verify the first clean install/build before declaring Phase 0 complete.

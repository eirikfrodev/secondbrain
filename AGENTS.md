# Utsikt repository instructions

Read `HANDOFF.md` and `design/reference/README.md` before substantive work. Inspect `design/boards/1a.png` through `1h.png` before frontend changes.

## Product boundary

ChatGPT interprets, recommends and prepares. The user approves. Utsikt executes through narrow, validated capabilities.

Never let model-generated content directly send messages, create invitations, spend money, run SQL, call arbitrary URLs or execute code.

## Engineering rules

- TypeScript strict mode; avoid `any`.
- Validate every external boundary with Zod.
- Keep a fixed item envelope plus versioned JSONB item documents.
- Item revisions are append-only.
- External effects require current-revision validation, idempotency and audit events.
- Never execute model-provided HTML, JavaScript, CSS classes, SQL or shell commands.
- Unknown UI blocks render fallback text; degrade, never break.
- Personal and work workspaces stay isolated.
- Never expose tokens, service-role keys or message bodies in logs.

## Visual rules

- Match the supplied boards closely.
- No gradients, shadows, generic rounded cards or AI gimmicks.
- Radius 0 except state dots.
- Familjen Grotesk + JetBrains Mono.
- Use the supplied paper/ink/fjord token system.
- Expansion is in place, not a modal.
- Mobile is triage, not a scaled desktop.
- Meet WCAG 2.2 AA.

## Workflow

Before each phase, update `docs/implementation-plan.md`. After each phase, update `docs/implementation-status.md`.

Run before completion:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm test:visual
```

Do not declare work complete with failing tests, unresolved type errors or unreviewed visual drift.

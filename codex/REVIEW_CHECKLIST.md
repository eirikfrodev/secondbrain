# Codex phase review checklist

## Product

- [ ] The result preserves the operator/approval/execution boundary.
- [ ] It does not turn Utsikt into a generic todo, email or calendar app.
- [ ] New workflow types can be composed without workflow-specific cards.

## Engineering

- [ ] Strict TypeScript and Zod validation at boundaries.
- [ ] No `any` introduced without an explicit documented reason.
- [ ] Item revisions remain append-only.
- [ ] External effects are current-revision validated and idempotent.
- [ ] Failure and partial success are represented accurately.
- [ ] Workspace isolation remains enforced.

## Security

- [ ] No model-provided HTML/JS/CSS/SQL/shell execution.
- [ ] No arbitrary provider, URL or database tool.
- [ ] No token or sensitive source body in browser bundles or logs.
- [ ] Source content is treated as untrusted data.

## Visual

- [ ] Compared against the relevant board at target viewport.
- [ ] No generic rounded-card drift, shadow drift or AI styling.
- [ ] Typography, spacing, rules and action hierarchy are preserved.
- [ ] Mobile is a triage experience, not a shrunk desktop.
- [ ] WCAG 2.2 AA and keyboard paths pass.

## Verification

- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm test:integration`
- [ ] `pnpm test:e2e`
- [ ] `pnpm test:visual`
- [ ] `docs/implementation-status.md` updated
- [ ] Material deviations documented as ADRs

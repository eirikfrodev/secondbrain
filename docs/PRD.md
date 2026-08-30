# Utsikt product requirements

This is the implementation entry point required by repository policy. `HANDOFF.md` is the complete and canonical PRD.

## Product outcome

Utsikt is a persistent personal control panel that answers what is happening, what deserves attention, what the operator recommends, what the user can do, and what has already happened. It is desktop-first with a dedicated mobile triage experience.

## Responsibility boundary

ChatGPT interprets source context, recommends, drafts, and prepares narrow actions. The user approves consequential actions. Utsikt validates and executes those actions deterministically through provider-specific capabilities. Source content never becomes authority.

## Phase 0/1 outcome

- A credential-free mock application at Today, Week, Month, and direct item routes.
- A fixed item envelope plus versioned dynamic item documents.
- Generic renderers for every stock block, including safe unknown-block fallback.
- Dynamic actions with explicit hierarchy and consequences; no real external execution.
- In-place desktop expansion, draft review, Ask/queue states, keyboard navigation, and 393px triage.
- Deterministic scenarios for Anders, Copenhagen hotels, the architect, passport renewal, Athens research, protected PDF failure, and the drifting water-filter project.
- Visual and accessibility verification against boards `1a`–`1g`.

## Acceptance

The detailed product, visual, security, API, data, and phase acceptance criteria are in `HANDOFF.md`, `design/reference/README.md`, `specs/`, and `codex/REVIEW_CHECKLIST.md` in that order of authority.

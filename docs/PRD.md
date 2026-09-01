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

## Phase 2 current outcome

- Preserve the credential-free mock application while adding a fail-closed Supabase live mode.
- Use Google for application identity only. Admit exactly one privately configured owner; do not offer email/password, magic-link, anonymous, phone, or alternate social sign-in.
- Bind the admitted owner to one immutable Supabase user UUID and provision one personal workspace/membership atomically before product access.
- Require a verified session plus RLS-visible owner workspace at every live product-page and interaction boundary.
- Expose only narrow same-origin Ask queue and queued-job cancellation routes: strict caller input, trusted workspace/requester/job fields, reduced receipts, and no external provider effect.
- Keep later Gmail/Calendar execution consent, credentials, scopes, tokens, and provider effects separate from sign-in.
- Never commit the owner's address or Google credentials, and never require them for automated tests.

## Acceptance

The detailed product, visual, security, API, data, and phase acceptance criteria are in `HANDOFF.md`, `design/reference/README.md`, `specs/`, and `codex/REVIEW_CHECKLIST.md` in that order of authority.

# Utsikt security assumptions

The full security model is in `docs/security/SECURITY_MODEL.md` and `HANDOFF.md`. This file records implementation-facing assumptions for the public web application.

- The browser is untrusted and receives no service-role key, OAuth refresh token, encryption key, provider credential, or unrestricted execution payload.
- Email, calendar, message, attachment, webpage, and model-composed content are untrusted data.
- Dynamic documents can select only registered block types and plain data. No generated HTML, JavaScript, CSS classes, SQL, shell, arbitrary URL fetch, or file write is executed.
- Browser APIs require authenticated workspace membership. MCP uses separate strong authentication. Personal and work workspaces are isolated.
- External actions require a current item revision, capability-specific Zod validation, source/account checks, idempotency, audit events, and explicit user approval where required.
- Irreversible communication is delayed locally before provider execution; Cancel is not described as recall. Undo is shown only when compensation is real.
- Mock mode is the default and performs no provider calls.
- Production deployment is not authorised by ordinary implementation work.

The Phase 2 baseline now enforces deny-by-default grants, workspace RLS, append-only history, requester-scoped cancellation, and capability/document constraints in the database. Revisit this model before Phase 4 credentials and external execution.

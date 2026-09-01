# API contract quick reference

The canonical behaviour is in `HANDOFF.md`. Implement and document these routes:

```text
GET    /api/dashboard?view=today|week|month
GET    /api/items/:id
POST   /api/items/:id/ask
POST   /api/ask
POST   /api/ai-jobs/:id/cancel
POST   /api/actions/:id/approve
POST   /api/executions/:id/cancel
POST   /api/executions/:id/undo
PATCH  /api/drafts/:externalObjectId
GET    /api/activity
GET    /api/source-health
GET    /api/integrations
GET    /api/oauth/google/start
GET    /api/oauth/google/callback
POST   /api/integrations/google/disconnect
POST   /api/mcp
```

Rules:

- Browser APIs require authenticated workspace membership.
- MCP uses separate strong authentication and narrow schemas.
- Approval verifies current item revision, expiry, source resolution, provider scope and idempotency.
- Long-running external execution belongs to the Mac worker, not a Vercel request lifecycle.
- Errors return stable codes plus plain-language recovery information.

## Implemented Phase 2 mutation boundary

The first browser mutation slice implements:

```text
POST   /api/items/:id/ask
POST   /api/ask
POST   /api/ai-jobs/:id/cancel
```

Ask accepts only a strict JSON object containing `instruction` (trimmed, 1–2,000 characters). Item/job IDs are UUID path parameters. Workspace ID, requester, origin, priority, status, schedule, result, and audit data are always server/database owned. Cancellation accepts no request body and is idempotent after a queued job reaches `cancelled`.

Every live request must use the exact configured application origin and path; local mock requests use the exact loopback development origin. Requests contain no query string, include matching `Origin` and `Sec-Fetch-Site: same-origin` headers, and stay within the 16 KiB streaming body limit. Ask accepts only `application/json` with an optional UTF-8 charset. Content encoding, unknown object keys, caller-supplied authority fields, and non-empty cancellation bodies are rejected before session or repository construction.

Queue success is `201`; cancellation success is `200`. Responses expose only this validated receipt:

```json
{
  "job": {
    "id": "00000000-0000-4000-8000-000000000000",
    "itemId": null,
    "instruction": "Reassess next week",
    "origin": "global_ask",
    "status": "queued",
    "queuedFor": "2026-09-01T12:00:00.000Z",
    "createdAt": "2026-09-01T11:55:00.000Z",
    "completedAt": null
  }
}
```

Errors use a fixed `{ "error": { "code", "message" } }` envelope. Implemented codes are `invalid_request`, `payload_too_large`, `unsupported_media_type`, `not_authenticated`, `forbidden`, `item_not_found`, `job_not_found`, `operator_schedule_unavailable`, `job_not_cancellable`, `temporarily_unavailable`, and `internal_error`. Database/provider causes, Zod issue details, user instructions, and identifiers are never reflected in an error.

Supabase mode derives the user and personal workspace from the verified Google/OAuth session. Item Ask and cancellation pass this server-owned workspace to their caller-scoped RPCs; each RPC constrains the target lookup to that exact workspace before inserting or updating, so membership in a second workspace cannot widen the request. RLS remains a second boundary. Mock mutation routes are disabled with `404` outside loopback development/test, use one process-local seeded repository capped at 256 retained jobs, and call no remote service. They are never a deployable persistence substitute. Neither mode can execute an external provider action; Ask only creates a queued internal AI job.

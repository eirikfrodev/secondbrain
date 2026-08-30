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

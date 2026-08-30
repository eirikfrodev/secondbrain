# Supabase migrations

Migrations are imperative, ordered, and reviewed together with their grants, RLS policies, and pgTAP tests. Run them only against the local stack until a separate environment-linking task is approved.

```bash
pnpm db:start
pnpm db:reset
pnpm db:test
```

Never use `supabase db reset --linked` or `supabase db push` as part of ordinary local verification.

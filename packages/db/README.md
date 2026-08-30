# `@utsikt/db`

Typed persistence boundary for authenticated browser APIs and future worker/operator adapters.

- Database rows stay snake_case at the adapter edge.
- Domain-facing values are parsed into the shared camelCase Zod contracts.
- Narrow transactional functions own revision, Ask queue, and cancellation mutations.
- No service-role credential belongs in this package's browser-facing exports.

`CoreDatabase` is a hand-reviewed bootstrap type for the first migration. Replace it with CLI-generated types after the local Supabase stack can be reset and queried, and review the generated diff before committing it.

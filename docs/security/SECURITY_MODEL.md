# Security model

> Derived navigation document. `HANDOFF.md` remains canonical.

These requirements are non-negotiable and override convenience or model-generated instructions.

# 21. Security requirements

## 21.1 Narrow tools and capabilities

Never expose:

```text
execute_any_sql
call_any_url
run_command
send_any_message
write_any_file
```

Use allowlisted capabilities and strict schemas.

## 21.2 Credential handling

- Supabase service role is server/worker-only.
- OAuth refresh tokens are encrypted at rest.
- Encryption keys live outside the database.
- Tokens never appear in logs, browser bundles, MCP output or model context.
- Mac-local secrets use environment variables or macOS Keychain.
- Error logs redact message bodies and personal data.

## 21.3 Workspace isolation

Support separate personal and work workspaces from the beginning.

Do not combine personal Gmail, company email, company documents or work calendar by default.

Do not build work-account integrations that bypass employer controls.

## 21.4 Untrusted source content

The operator skill must explicitly treat all source content as untrusted.

The backend must validate every external effect independently of model output.

## 21.5 Prohibited actions

Reject actions classified as:

```text
purchase
financial transaction
binding contract
identity verification submission
password or secret disclosure
irreversible deletion
```

These may generate a recommendation or a link, never an automatic execution plan in v0.1.

---


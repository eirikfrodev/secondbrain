# Machine-readable specification

These files turn the handoff into concrete starting artefacts for domain implementation and tests.

```text
schemas/item-document-v1.schema.json
schemas/action-v1.schema.json
schemas/operator-commit-v1.schema.json
capabilities/action-capabilities.yaml
fixtures/*.json
```

`HANDOFF.md` remains canonical if a generated schema or fixture conflicts with the prose. Codex should implement equivalent Zod schemas in `packages/domain` and keep these fixtures as regression test vectors.

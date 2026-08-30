# Utsikt — Codex starter repository

This archive is organised so it can be unzipped into a new repository and handed directly to Codex.

## Start

1. Unzip the archive. The repository root is the `utsikt/` folder.
2. Initialise Git if needed:

   ```bash
   git init
   ```

3. Open the folder in Codex.
4. Paste the contents of [`codex/INITIAL_TASK.md`](codex/INITIAL_TASK.md) as the first task.
5. Let Codex inspect the package before it writes production code.

Codex must read these first:

```text
AGENTS.md
HANDOFF.md
docs/README.md
design/README.md
design/reference/README.md
```

It must also inspect all boards in `design/boards/`.

## Canonical sources

- [`HANDOFF.md`](HANDOFF.md) is the canonical full product, architecture and delivery specification.
- [`AGENTS.md`](AGENTS.md) contains persistent repository rules.
- [`design/reference/README.md`](design/reference/README.md) and the rendered boards are the visual source of truth.
- `docs/` contains smaller, task-focused extracts from the canonical handoff.
- `specs/` contains machine-readable schemas, fixtures and capability contracts.
- `codex/` contains the implementation sequence and review checklists.

When two documents disagree, use this priority:

1. Security and data integrity in `HANDOFF.md`.
2. Product boundaries in `HANDOFF.md`.
3. Rendered design boards and `design/reference/README.md`.
4. Derived documents under `docs/` and `specs/`.

## Intended repository layout

The package includes empty implementation locations and responsibility notes. Codex should scaffold the actual app into them:

```text
apps/web
apps/worker
packages/domain
packages/db
packages/ui
packages/connectors
packages/operator
packages/testing
plugin/skills
supabase/migrations
```

Start in mock mode. Do not require Google credentials until the complete mock lifecycle works.

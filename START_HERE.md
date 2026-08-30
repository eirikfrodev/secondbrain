# Start here

The fastest correct path is:

1. Read `AGENTS.md`.
2. Read `HANDOFF.md`.
3. Read `design/README.md` and inspect boards `1a`–`1h`.
4. Read `codex/INITIAL_TASK.md`.
5. Create the planning documents requested there.
6. Implement mock mode and the pixel-faithful dynamic UI before adding external credentials.

Do not begin with Gmail, Calendar, MCP or arbitrary generated HTML. The first vertical slice is:

```text
validated dynamic item JSON
→ generic block renderer
→ Today / expanded item / Week / Month / mobile
→ dynamic actions
→ Ask queue in mock mode
```

The invariant across all later work is:

> ChatGPT interprets, recommends and prepares. The user approves. Utsikt executes deterministically.

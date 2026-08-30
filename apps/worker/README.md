# `apps/worker`

Long-running TypeScript worker for the Mac mini. It atomically claims due execution runs, refreshes OAuth tokens, calls provider connectors, retries transient errors, records audit events and emits heartbeats. No inbound public port.

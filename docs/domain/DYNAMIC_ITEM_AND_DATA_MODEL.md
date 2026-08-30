# Dynamic item, data and action model

> Derived navigation document. `HANDOFF.md` remains canonical.

Use this file while implementing domain schemas, migrations, dynamic rendering, actions and Ask jobs.

# 8. Domain model

The design must remain highly dynamic without turning the database into an unsearchable blob.

Use a hybrid:

- a small fixed envelope for deterministic overview queries;
- a versioned JSONB document for item-specific UI and content;
- separately validated executable actions;
- append-only revisions and audit events.

## 8.1 Item envelope

```ts
export const ItemState = z.enum([
  "needs_you",
  "draft_ready",
  "queued",
  "working",
  "waiting",
  "done",
  "stuck",
  "archived",
]);

export const AttentionTier = z.enum([
  "needs_you",
  "in_motion",
  "waiting",
  "handled",
]);

export const ItemEnvelopeSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  stableKey: z.string().min(1).max(300),
  version: z.number().int().positive(),

  state: ItemState,
  tier: AttentionTier,
  priority: z.number().int().min(0).max(100),
  attentionRank: z.number().int(),

  titleLead: z.string().min(1).max(100),
  situation: z.string().min(1).max(320),
  recommendation: z.string().max(500).nullable(),

  requiresUserAttention: z.boolean(),
  dueAt: z.string().datetime().nullable(),
  reviewAt: z.string().datetime().nullable(),
  waitingSince: z.string().datetime().nullable(),

  projectId: z.string().uuid().nullable(),
  currentRevisionId: z.string().uuid(),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  archivedAt: z.string().datetime().nullable(),
});
```

Enforce uniqueness on:

```text
workspace_id + stable_key
```

Stable-key examples:

```text
gmail:<account>:thread:<thread-id>
calendar:<account>:event:<event-id>
project:<project-stable-key>:decision:<topic>
manual:<captured-open-loop-id>
```

The operator must update an existing item where possible instead of creating duplicates.

## 8.2 Dynamic item document

```ts
export const ItemDocumentV1Schema = z.object({
  schemaVersion: z.literal(1),

  spine: z.object({
    titleLead: z.string().min(1).max(100),
    situation: z.string().min(1).max(320),
    recommendation: z.string().max(500).nullable(),
    stateLabel: z.string().min(1).max(50),
    sourceLabel: z.string().max(100).nullable(),
    sourceTime: z.string().max(100).nullable(),
    provenance: z.object({
      kind: z.enum([
        "email",
        "calendar",
        "message",
        "chat",
        "user_request",
        "operator",
        "project",
        "manual",
      ]),
      label: z.string().max(220),
      quote: z.string().max(700).optional(),
      sourcesRead: z.number().int().nonnegative().optional(),
      confidence: z.enum(["explicit", "strong", "inferred"]).optional(),
    }).optional(),
  }),

  blocks: z.array(ItemBlockSchema).max(12),
  actionIds: z.array(z.string().uuid()).max(4),

  ask: z.object({
    enabled: z.literal(true),
    placeholder: z.string().max(160).optional(),
  }),
});
```

## 8.3 Stock blocks

Every block has:

```ts
{
  id: string;
  type: string;
  schemaVersion: 1;
  fallbackText: string;
}
```

Implement these discriminated-union block types:

```text
text
quote
callout
comparison_table
slots
steps
checklist
progress
draft
day_strip
key_value
```

Recommended schemas:

```ts
TextBlock       { text }
QuoteBlock      { label, quote, attribution? }
CalloutBlock    { text, tone: "reasoning" | "warning" | "success" }
ComparisonTable { columns[], rows[], recommendedRowId? }
SlotsBlock      { options[], recommendedOptionId?, overflowLabel? }
StepsBlock      { steps: {id,label,detail?,state}[] }
ChecklistBlock  { items: {id,label,detail?,state,linkLabel?}[] }
ProgressBlock   { value, max, label, detail? }
DraftBlock      { channel, recipientLabel, subject?, body, editable, providerState }
DayStripBlock   { days: {label,date,slots[]}[]; proposedSlotId? }
KeyValueBlock   { entries: {label,value,emphasis?}[] }
```

Limits:

- comparison tables: maximum 5 rows and 5 columns;
- actions: maximum 4;
- one short paragraph per text block;
- no arbitrary CSS, HTML, JavaScript or Tailwind classes from the operator;
- unknown block types render `fallbackText` as a normal text block and create an audit warning;
- malformed blocks do not crash the item or page.

The rule is:

> Degrade, never break.

## 8.4 Future custom renderer extension

Do not implement arbitrary generated HTML in v0.1.

Leave this reviewed-renderer extension point:

```ts
type CustomRendererReference = {
  rendererId: string;
  rendererVersion: number;
  payload: unknown;
};
```

A future experimental sandboxed HTML renderer may use a unique-origin iframe, strict CSP, no credentials, no same-origin permission, no unrestricted network and a narrow `postMessage` bridge. It is explicitly outside v0.1.

---


# 9. Database schema

Create migrations for the following tables.

## 9.1 `workspaces`

```text
id uuid primary key
owner_user_id uuid
name text
kind personal | work
timezone text default 'Europe/Oslo'
locale text default 'nb-NO'
created_at timestamptz
updated_at timestamptz
```

Personal and work data must remain separate by default.

## 9.2 `integration_accounts`

```text
id
workspace_id
provider                 google | microsoft | messages | manual
account_identifier
status                   connected | disconnected | expired | error
granted_scopes text[]
access_token_ciphertext
refresh_token_ciphertext
token_expires_at
metadata jsonb
created_at
updated_at
```

Tokens must be encrypted before storage and never exposed to browser code, MCP output, model context or normal logs.

## 9.3 `source_records`

Store minimal source identity and evidence, not a full copy of the mailbox.

```text
id
workspace_id
provider
source_type              email | calendar | message | chat | manual | project
account_identifier
external_id nullable
external_thread_id nullable
internet_message_id nullable
resolution               exact | search_hint | unresolved
title
sender
occurred_at
deep_link nullable
snippet nullable
content_hash nullable
metadata jsonb
created_at
last_seen_at
```

Do not offer an executable Gmail reply action unless the source can be resolved exactly by the Utsikt connector.

## 9.4 `items`

Use the fixed envelope described above.

## 9.5 `item_revisions`

Append-only:

```text
id
item_id
version
document jsonb
source_ref_ids uuid[]
operator_run_id nullable
created_by       user | operator | system
created_at
```

Never overwrite historical revision JSON.

## 9.6 `actions`

```text
id
workspace_id
item_id
item_revision_id

kind                     internal | ai | external | hybrid
capability
label
recommended boolean
visual_tone              ink | fjord | outline | link
consequence text nullable
effect_plan jsonb
payload jsonb
risk_level               internal | external_reversible |
                         external_irreversible | prohibited
status                   proposed | approved | prepared | scheduled |
                         executing | succeeded | failed | cancelled | expired
allow_stale_execution boolean default false
execute_after nullable
expires_at nullable
created_at
updated_at
```

Executable payloads live here, not only inside display JSON.

## 9.7 `ai_jobs`

```text
id
workspace_id
item_id nullable
instruction
origin                   inline_ask | global_ask | operator | capture | system
priority
status                   queued | working | completed | stuck | cancelled
queued_for
result_summary nullable
result_payload jsonb
attempt_count
created_at
started_at
completed_at
```

## 9.8 `projects`

```text
id
workspace_id
stable_key
name
status                   active | waiting | decided | dropped | completed
summary
review_at nullable
last_activity_at
created_at
updated_at
```

## 9.9 `project_notes`

```text
id
project_id
source_type
source_ref_id nullable
summary
confidence               explicit | strong | inferred
last_confirmed_at nullable
created_at
```

## 9.10 `operator_runs`

```text
id
workspace_id
run_type                 morning | midday | evening | manual | event
idempotency_key unique
status                   started | committed | failed
snapshot_version
summary jsonb
error nullable
started_at
completed_at nullable
```

## 9.11 `execution_runs`

```text
id
workspace_id
action_id
idempotency_key unique
status                   scheduled | executing | succeeded |
                         failed | cancelled | compensated
execute_after
cancel_until nullable
attempt_count
provider_result jsonb
error_code nullable
error_message nullable
compensation_capability nullable
compensation_payload jsonb nullable
started_at nullable
completed_at nullable
created_at
updated_at
```

## 9.12 `external_objects`

Track real drafts, messages and events:

```text
id
workspace_id
provider
type                     email_draft | email_message | calendar_event
external_id
item_id nullable
action_id nullable
content_hash nullable
state
metadata jsonb
created_at
updated_at
```

## 9.13 `audit_events`

```text
id
workspace_id
actor_type               user | chatgpt | worker | system
actor_id nullable
event_type
entity_type
entity_id
payload jsonb
created_at
```

## 9.14 RLS and indexing

Enable RLS on every exposed table.

All browser queries must be constrained by authenticated user membership and workspace.

Add indexes for:

```text
items(workspace_id, tier, attention_rank)
items(workspace_id, due_at)
items(workspace_id, review_at)
items(workspace_id, stable_key) unique
ai_jobs(workspace_id, status, queued_for)
execution_runs(status, execute_after)
source_records(workspace_id, provider, external_thread_id)
projects(workspace_id, status, review_at)
audit_events(workspace_id, created_at desc)
```

Use database transactions for operator commits and action approval.

---


# 10. Actions and execution

## 10.1 Initial capability registry

Internal:

```text
item.complete
item.reopen
item.snooze
item.dismiss
item.archive
project.reassess
project.drop
```

AI work:

```text
ai.enqueue
```

External:

```text
gmail.ensure_reply_draft
gmail.update_reply_draft
gmail.schedule_send_draft
gmail.cancel_scheduled_send
calendar.create_event
calendar.create_private_hold
calendar.delete_event
workflow.reply_and_calendar
url.open
```

Future:

```text
messages.schedule_send
microsoft.ensure_reply_draft
microsoft.schedule_send_draft
microsoft.create_event
browser.research
file.create
```

## 10.2 Action rules

- An actionable item has 1–4 visible actions.
- Exactly one is primary/recommended.
- Working or purely informational items may temporarily have no actions.
- The frontend renders only allowlisted capability types.
- The backend validates every payload with a capability-specific Zod schema.
- The model cannot supply an arbitrary sender, database query, URL request or shell command.
- Every external action displays its exact consequence before approval.
- The backend derives the connected provider account; the model does not choose a `From` address.
- Recipient changes require explicit user editing and validation.
- Do not silently add CC or BCC recipients.
- Actions expire when their context becomes stale.
- An action tied to an old item revision must fail safely unless explicitly marked stale-safe.

## 10.3 Approval API

Implement:

```text
POST /api/actions/:actionId/approve
```

It must:

1. authenticate the user;
2. verify workspace ownership;
3. load the item, current revision and action;
4. reject stale or expired actions;
5. validate the payload;
6. check provider scopes and connector health;
7. acquire an idempotency lock;
8. create an execution run or perform a safe internal mutation;
9. return the new state;
10. write an audit event.

Also implement:

```text
POST /api/executions/:executionId/cancel
POST /api/executions/:executionId/undo
```

Only expose Undo if a real compensation is available.

## 10.4 The 30-second grace period

Do not claim sent email or SMS can be recalled.

For irreversible communication:

```text
User approves
→ execution run scheduled for now + 30 seconds
→ UI shows “Sending in 30 s · Cancel”
→ worker executes after the grace period
```

After provider acceptance, remove Cancel. Show Undo only if the provider has a genuine reversible operation.

## 10.5 Gmail draft lifecycle

Distinguish:

```text
dashboard draft only
creating Gmail draft
Gmail draft ready
draft changed externally
send scheduled
sent
failed
```

Recommended behaviour:

1. Operator prepares one or more textual alternatives in Utsikt.
2. The recommended alternative may be materialised as a Gmail draft.
3. Selecting another option updates the existing draft rather than creating duplicates.
4. Store provider draft ID and content hash.
5. Re-fetch before send.
6. If the draft changed externally, either treat the current Gmail draft as authoritative or stop for review; never overwrite silently.
7. Send once using idempotency and persist the resulting provider message ID.

## 10.6 Calendar lifecycle

Before creating an event:

- parse all dates in `Europe/Oslo` unless the item explicitly specifies another timezone;
- re-check availability immediately before execution;
- distinguish a private hold from an event with attendees;
- use a grace period before creating attendee invitations;
- if a new conflict appears, fail into a visible `stuck` state with recovery actions.

## 10.7 Hybrid workflows

Support saga-style actions such as:

```text
Send reply accepting Thursday 14:00
Create calendar event
Mark item handled
```

Persist every step. If one step fails, display exactly what happened.

Example recovery item:

```text
Reply sent, but the calendar event could not be added.

[Add event again]
[Open Calendar]
[Mark handled]
```

Never pretend the entire workflow succeeded.

---


# 13. Ask queue and user instructions

## 13.1 Inline Ask

Every item has an Ask field.

```text
POST /api/items/:itemId/ask
```

Request:

```ts
{ instruction: string }
```

This creates an `ai_job` and immediately changes the UI to:

```text
↳ you: “find another day next week instead”
queued for 13:00 sync
Cancel
```

## 13.2 Global Ask

```text
POST /api/ask
```

A global request may result in:

- one new item;
- multiple items;
- an update to an existing item;
- a new or updated project;
- a question back to the user.

## 13.3 Run now

Do not pretend the web app can directly force a ChatGPT scheduled run unless an officially supported trigger is configured.

For v0.1:

- queue the job with high priority;
- display the exact next operator run;
- allow cancellation;
- keep a runner interface so a direct API or supported event trigger can be added later.

---


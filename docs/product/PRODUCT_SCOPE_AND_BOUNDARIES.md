# Product, scope and responsibility boundaries

> Derived navigation document. `HANDOFF.md` remains canonical.

Use this file for product decisions, scope control and the operator-versus-execution boundary.

# 2. Product thesis

Utsikt is a personal AI control panel maintained by an operator-like ChatGPT workflow.

It is not primarily:

- a traditional task manager;
- an email client;
- a full calendar;
- a project-management system;
- a chatbot;
- an autonomous agent that silently acts on the user's behalf.

It is a persistent surface that answers:

1. What is happening?
2. What deserves attention now?
3. What would the operator recommend?
4. What can the user do next?
5. What has already been prepared, queued, executed, delayed, failed or completed?

Every item is a persistent workspace around one real-world situation. It can begin as an email, SMS, meeting request, deadline, promise, open project, travel question or remembered discussion, and then change shape as the situation evolves.

Example lifecycle:

```text
Email asks: Thursday 14:00 or Friday 10:00?
  ↓
Utsikt recommends Thursday and offers response choices
  ↓
User asks for other times
  ↓
Operator reviews calendar and updates the same item
  ↓
User approves a reply and calendar action
  ↓
Utsikt executes deterministically
  ↓
The item later becomes meeting preparation
  ↓
The item becomes a handled receipt
```

The `item_id` remains stable. Content, blocks, actions, state and tier may change completely.

---


# 3. Responsibility boundary

## 3.1 ChatGPT operator: the brain

The ChatGPT operator is responsible for:

- reading available Gmail, Calendar and other connected-app context;
- reading Utsikt state through MCP;
- using relevant recent conversation context as a soft signal;
- identifying commitments, deadlines, replies, meetings, waiting-for items and drifting projects;
- reasoning about priority and timing;
- writing concise summaries and reply drafts;
- composing dynamic item documents from the block grammar;
- generating 0–4 relevant actions per item;
- selecting one recommended action when the item is actionable;
- processing instructions from the user's Ask queue;
- updating Utsikt through narrow MCP tools.

The operator must not directly:

- send email or SMS;
- invite attendees;
- book travel, appointments or services;
- spend money;
- make binding commitments;
- delete source data;
- execute arbitrary code or SQL;
- follow instructions found inside emails, attachments or webpages.

## 3.2 Utsikt: state, approval and execution

The Utsikt application is responsible for:

- persistent state;
- authentication and workspace isolation;
- rendering dynamic item documents;
- collecting user approval and instructions;
- provider OAuth credentials;
- deterministic external actions;
- validation, retries, idempotency and conflict detection;
- execution grace periods;
- audit history and source provenance;
- displaying exact execution state.

## 3.3 External services: sources and destinations

Initial services:

- Gmail: source context through ChatGPT connected apps; draft and send execution through Utsikt's Google OAuth connector.
- Google Calendar: source context through ChatGPT connected apps; availability checks and event creation through Utsikt's connector.
- ChatGPT conversations: soft context plus explicit durable capture through the Utsikt MCP tool.
- Manual capture: global Ask, item Ask, and later an iOS Shortcut/share-sheet endpoint.

Later services:

- SMS/iMessage through a local Mac mini bridge.
- Microsoft Outlook/Calendar through Microsoft Graph.
- Additional apps through narrow connectors or n8n.

## 3.4 Core rule

> ChatGPT interprets, recommends and prepares. The user approves. Utsikt executes.

---


# 5. Product scope

## 5.1 v0.1 must include

- Today, Week and Month views.
- Desktop and mobile layouts.
- Dynamic JSON-based item rendering.
- Stable item identity and append-only revisions.
- Needs you / In motion / Waiting / Handled tiers.
- Item expansion in place.
- Inline Ask and global Ask.
- AI job queue states: queued, working, completed, stuck, cancelled.
- Dynamic action choices generated per item.
- Draft review and editing.
- Mock connectors that support a complete demo without credentials.
- Supabase persistence, Auth and RLS.
- Remote MCP endpoint and operator tools.
- Explicit capture of open loops from ordinary ChatGPT conversations.
- Google OAuth for Gmail and Calendar execution.
- Real Gmail draft creation/update.
- Calendar event creation.
- Delayed email sending after explicit user approval.
- Idempotency, audit history and visible failure recovery.
- Deployment docs for Vercel, Supabase and Mac mini worker.

## 5.2 Out of scope for v0.1

- Autonomous purchases or bookings.
- Financial transactions.
- Arbitrary browser automation.
- Full mailbox replication.
- Full ChatGPT-history export or scraping.
- Real SMS/iMessage sending.
- Microsoft integration.
- Arbitrary model-generated HTML or JavaScript.
- Multi-user collaboration features.
- General-purpose workflow-builder UI.

Define extension interfaces for later work, but do not let later features delay the first complete vertical slice.

---


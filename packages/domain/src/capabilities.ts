export const capabilityValues = [
  "item.complete",
  "item.reopen",
  "item.snooze",
  "item.dismiss",
  "item.archive",
  "project.reassess",
  "project.drop",
  "ai.enqueue",
  "gmail.ensure_reply_draft",
  "gmail.update_reply_draft",
  "gmail.schedule_send_draft",
  "gmail.cancel_scheduled_send",
  "calendar.create_event",
  "calendar.create_private_hold",
  "calendar.delete_event",
  "workflow.reply_and_calendar",
  "url.open"
] as const;

export type Capability = (typeof capabilityValues)[number];

export type CapabilityPolicy = {
  kind: "internal" | "ai" | "external" | "hybrid";
  risk: "internal" | "external_reversible" | "external_irreversible";
  approval: "direct" | "explicit";
  gracePeriodSeconds: number;
  compensableAfterExecution: boolean;
};

export const capabilityPolicies = {
  "item.complete": { kind: "internal", risk: "internal", approval: "direct", gracePeriodSeconds: 0, compensableAfterExecution: true },
  "item.reopen": { kind: "internal", risk: "internal", approval: "direct", gracePeriodSeconds: 0, compensableAfterExecution: true },
  "item.snooze": { kind: "internal", risk: "internal", approval: "direct", gracePeriodSeconds: 0, compensableAfterExecution: true },
  "item.dismiss": { kind: "internal", risk: "internal", approval: "direct", gracePeriodSeconds: 0, compensableAfterExecution: true },
  "item.archive": { kind: "internal", risk: "internal", approval: "direct", gracePeriodSeconds: 0, compensableAfterExecution: true },
  "project.reassess": { kind: "ai", risk: "internal", approval: "direct", gracePeriodSeconds: 0, compensableAfterExecution: false },
  "project.drop": { kind: "internal", risk: "internal", approval: "direct", gracePeriodSeconds: 0, compensableAfterExecution: true },
  "ai.enqueue": { kind: "ai", risk: "internal", approval: "direct", gracePeriodSeconds: 0, compensableAfterExecution: true },
  "gmail.ensure_reply_draft": { kind: "external", risk: "external_reversible", approval: "explicit", gracePeriodSeconds: 0, compensableAfterExecution: true },
  "gmail.update_reply_draft": { kind: "external", risk: "external_reversible", approval: "explicit", gracePeriodSeconds: 0, compensableAfterExecution: true },
  "gmail.schedule_send_draft": { kind: "external", risk: "external_irreversible", approval: "explicit", gracePeriodSeconds: 30, compensableAfterExecution: false },
  "gmail.cancel_scheduled_send": { kind: "external", risk: "external_reversible", approval: "direct", gracePeriodSeconds: 0, compensableAfterExecution: false },
  "calendar.create_event": { kind: "external", risk: "external_irreversible", approval: "explicit", gracePeriodSeconds: 30, compensableAfterExecution: false },
  "calendar.create_private_hold": { kind: "external", risk: "external_reversible", approval: "explicit", gracePeriodSeconds: 0, compensableAfterExecution: true },
  "calendar.delete_event": { kind: "external", risk: "external_reversible", approval: "explicit", gracePeriodSeconds: 0, compensableAfterExecution: false },
  "workflow.reply_and_calendar": { kind: "hybrid", risk: "external_irreversible", approval: "explicit", gracePeriodSeconds: 30, compensableAfterExecution: false },
  "url.open": { kind: "external", risk: "internal", approval: "direct", gracePeriodSeconds: 0, compensableAfterExecution: false }
} satisfies Record<Capability, CapabilityPolicy>;

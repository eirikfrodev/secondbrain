import type { Action, Capability, ItemState } from "./schemas";

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

const allowedStateTransitions: Record<ItemState, readonly ItemState[]> = {
  needs_you: ["draft_ready", "queued", "working", "waiting", "done", "stuck", "archived"],
  draft_ready: ["needs_you", "queued", "working", "waiting", "done", "stuck", "archived"],
  queued: ["needs_you", "working", "stuck", "archived"],
  working: ["needs_you", "draft_ready", "waiting", "done", "stuck", "archived"],
  waiting: ["needs_you", "draft_ready", "queued", "done", "stuck", "archived"],
  done: ["needs_you", "archived"],
  stuck: ["needs_you", "queued", "working", "done", "archived"],
  archived: ["needs_you"]
};

export function canTransitionItem(from: ItemState, to: ItemState): boolean {
  return from === to || allowedStateTransitions[from].includes(to);
}

export function hasStableIdentity(left: { workspaceId: string; stableKey: string }, right: { workspaceId: string; stableKey: string }): boolean {
  return left.workspaceId === right.workspaceId && left.stableKey === right.stableKey;
}

export function isSameWorkspace(leftWorkspaceId: string, rightWorkspaceId: string): boolean {
  return leftWorkspaceId === rightWorkspaceId;
}

export function isActionStale(action: Pick<Action, "allowStaleExecution" | "itemRevisionId">, currentRevisionId: string): boolean {
  return !action.allowStaleExecution && action.itemRevisionId !== currentRevisionId;
}

export function isActionExpired(action: Pick<Action, "expiresAt">, now: Date): boolean {
  return Boolean(action.expiresAt && new Date(action.expiresAt).getTime() <= now.getTime());
}

export function getGracePeriodSeconds(capability: Capability): number {
  return capabilityPolicies[capability].gracePeriodSeconds;
}

export function requiresExplicitApproval(capability: Capability): boolean {
  return capabilityPolicies[capability].approval === "explicit";
}

export function canCompensateAfterExecution(capability: Capability): boolean {
  return capabilityPolicies[capability].compensableAfterExecution;
}

export function canOfferReplyAction(source: { resolution: "exact" | "search_hint" | "unresolved" }): boolean {
  return source.resolution === "exact";
}

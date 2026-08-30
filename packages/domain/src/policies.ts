import { capabilityPolicies } from "./capabilities";
import type { Capability } from "./capabilities";
import type { Action, ItemState } from "./schemas";

export { capabilityPolicies } from "./capabilities";
export type { CapabilityPolicy } from "./capabilities";

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

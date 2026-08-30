import { describe, expect, it } from "vitest";

import {
  canCompensateAfterExecution,
  canOfferReplyAction,
  canTransitionItem,
  getGracePeriodSeconds,
  hasStableIdentity,
  isActionExpired,
  isActionStale,
  isSameWorkspace,
  requiresExplicitApproval
} from "./policies";

describe("item identity and state", () => {
  it("deduplicates only within the same workspace and stable key", () => {
    const left = { workspaceId: "personal", stableKey: "gmail:me:thread:1" };
    expect(hasStableIdentity(left, { ...left })).toBe(true);
    expect(hasStableIdentity(left, { ...left, workspaceId: "work" })).toBe(false);
    expect(hasStableIdentity(left, { ...left, stableKey: "gmail:me:thread:2" })).toBe(false);
  });

  it("keeps personal and work workspace checks explicit", () => {
    expect(isSameWorkspace("personal", "personal")).toBe(true);
    expect(isSameWorkspace("personal", "work")).toBe(false);
  });

  it("allows recovery and reopen transitions without making archived terminal", () => {
    expect(canTransitionItem("working", "stuck")).toBe(true);
    expect(canTransitionItem("stuck", "queued")).toBe(true);
    expect(canTransitionItem("done", "working")).toBe(false);
    expect(canTransitionItem("archived", "needs_you")).toBe(true);
  });
});

describe("action execution policy", () => {
  it("rejects stale revision bindings unless explicitly safe", () => {
    expect(isActionStale({ itemRevisionId: "old", allowStaleExecution: false }, "current")).toBe(true);
    expect(isActionStale({ itemRevisionId: "old", allowStaleExecution: true }, "current")).toBe(false);
  });

  it("expires at the boundary, not after it", () => {
    const now = new Date("2026-08-30T10:00:00+02:00");
    expect(isActionExpired({ expiresAt: "2026-08-30T09:59:59+02:00" }, now)).toBe(true);
    expect(isActionExpired({ expiresAt: "2026-08-30T10:00:00+02:00" }, now)).toBe(true);
    expect(isActionExpired({ expiresAt: "2026-08-30T10:00:01+02:00" }, now)).toBe(false);
    expect(isActionExpired({ expiresAt: null }, now)).toBe(false);
  });

  it("uses a 30-second grace period only for irreversible communication/invitations", () => {
    expect(getGracePeriodSeconds("gmail.schedule_send_draft")).toBe(30);
    expect(getGracePeriodSeconds("calendar.create_event")).toBe(30);
    expect(getGracePeriodSeconds("workflow.reply_and_calendar")).toBe(30);
    expect(getGracePeriodSeconds("gmail.ensure_reply_draft")).toBe(0);
  });

  it("distinguishes explicit approval and real compensation", () => {
    expect(requiresExplicitApproval("workflow.reply_and_calendar")).toBe(true);
    expect(requiresExplicitApproval("item.complete")).toBe(false);
    expect(canCompensateAfterExecution("gmail.ensure_reply_draft")).toBe(true);
    expect(canCompensateAfterExecution("gmail.schedule_send_draft")).toBe(false);
  });

  it("offers reply execution only for an exactly resolved source", () => {
    expect(canOfferReplyAction({ resolution: "exact" })).toBe(true);
    expect(canOfferReplyAction({ resolution: "search_hint" })).toBe(false);
    expect(canOfferReplyAction({ resolution: "unresolved" })).toBe(false);
  });
});

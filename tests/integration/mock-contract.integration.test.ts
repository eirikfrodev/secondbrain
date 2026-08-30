import { describe, expect, it } from "vitest";

import {
  ItemFixtureSchema,
  canOfferReplyAction,
  getGracePeriodSeconds,
  isActionStale
} from "@utsikt/domain";
import { fixtureItems, meetingEmail, passportRenewal } from "@utsikt/testing";

describe("mock lifecycle contract", () => {
  it("loads every deterministic scenario through the public domain schema", () => {
    expect(fixtureItems.map((fixture) => ItemFixtureSchema.parse(fixture))).toHaveLength(7);
  });

  it("binds external actions to the current item revision", () => {
    const action = meetingEmail.actions[0];
    expect(action).toBeDefined();
    if (!action) return;
    expect(isActionStale(action, meetingEmail.item.currentRevisionId)).toBe(false);
    expect(isActionStale(action, passportRenewal.item.currentRevisionId)).toBe(true);
  });

  it("requires exact source resolution and delay before the meeting workflow could execute", () => {
    expect(canOfferReplyAction({ resolution: "search_hint" })).toBe(false);
    expect(canOfferReplyAction({ resolution: "exact" })).toBe(true);
    expect(getGracePeriodSeconds("workflow.reply_and_calendar")).toBe(30);
  });
});

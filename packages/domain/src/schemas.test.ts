import { describe, expect, it } from "vitest";

import {
  ActionSchema,
  AiJobSchema,
  AppendItemRevisionInputSchema,
  AskInstructionSchema,
  CancelAiJobInputSchema,
  ItemDocumentV1Schema,
  ItemFixtureSchema,
  KnownItemBlockSchema,
  QueueItemAskInputSchema,
  SourceHealthSchema,
  parseItemBlock
} from "./schemas";
import athensWorking from "../../../specs/fixtures/athens-working.json";
import hotelResearch from "../../../specs/fixtures/hotel-research.json";
import meetingEmail from "../../../specs/fixtures/meeting-email.json";
import passportRenewal from "../../../specs/fixtures/passport-renewal.json";
import projectResurfacing from "../../../specs/fixtures/project-resurfacing.json";
import stuckPdf from "../../../specs/fixtures/stuck-pdf.json";
import waitingForArchitect from "../../../specs/fixtures/waiting-for-architect.json";

const fixtures = [
  athensWorking,
  hotelResearch,
  meetingEmail,
  passportRenewal,
  projectResurfacing,
  stuckPdf,
  waitingForArchitect
];

describe("fixture contracts", () => {
  it.each(fixtures.map((fixture) => [fixture.item.stableKey, fixture]))(
    "validates %s",
    (_stableKey, fixture) => {
      expect(ItemFixtureSchema.parse(fixture)).toBeDefined();
    }
  );

  it("covers every stock renderer in the schema", () => {
    const stockTypes = KnownItemBlockSchema.options.map((schema) => schema.shape.type.value);
    expect(stockTypes).toEqual([
      "text",
      "quote",
      "callout",
      "comparison_table",
      "slots",
      "steps",
      "checklist",
      "progress",
      "draft",
      "day_strip",
      "key_value"
    ]);
  });
});

describe("degrade, never break", () => {
  it("turns an unknown block into fallback text", () => {
    expect(parseItemBlock({
      id: "future",
      type: "future_widget",
      schemaVersion: 1,
      fallbackText: "A safe summary of future content."
    })).toEqual({
      id: "future",
      type: "fallback",
      schemaVersion: 1,
      fallbackText: "A safe summary of future content.",
      originalType: "future_widget",
      reason: "unknown"
    });
  });

  it("turns a malformed known block into fallback text", () => {
    const document = ItemDocumentV1Schema.parse({
      ...hotelResearch.document,
      blocks: [{
        id: "broken-progress",
        type: "progress",
        schemaVersion: 1,
        fallbackText: "Research is still in progress.",
        value: 11,
        max: 10,
        label: "11 of 10"
      }]
    });

    expect(document.blocks[0]).toMatchObject({
      type: "fallback",
      originalType: "progress",
      reason: "malformed",
      fallbackText: "Research is still in progress."
    });
  });
});

describe("persistence boundaries", () => {
  it("rejects action authority that contradicts the capability registry", () => {
    const action = meetingEmail.actions[0];

    expect(ActionSchema.safeParse({
      ...action,
      kind: "internal",
      riskLevel: "internal"
    }).success).toBe(false);
  });

  it("normalizes an Ask instruction and rejects empty input", () => {
    expect(AskInstructionSchema.parse("  find another day  ")).toBe("find another day");
    expect(AskInstructionSchema.safeParse("   ").success).toBe(false);
  });

  it("binds item Ask and cancellation inputs to a workspace", () => {
    const workspaceId = meetingEmail.item.workspaceId;

    expect(QueueItemAskInputSchema.parse({
      workspaceId,
      itemId: meetingEmail.item.id,
      instruction: "  find another day  "
    })).toEqual({
      workspaceId,
      itemId: meetingEmail.item.id,
      instruction: "find another day"
    });
    expect(QueueItemAskInputSchema.safeParse({
      itemId: meetingEmail.item.id,
      instruction: "find another day"
    }).success).toBe(false);
    expect(CancelAiJobInputSchema.safeParse({
      workspaceId,
      jobId: "not-a-uuid"
    }).success).toBe(false);
    expect(CancelAiJobInputSchema.safeParse({
      jobId: "10101010-1010-4010-8010-101010101010"
    }).success).toBe(false);
  });

  it("rejects oversized evidence lists", () => {
    expect(AppendItemRevisionInputSchema.safeParse({
      itemId: meetingEmail.item.id,
      expectedVersion: meetingEmail.item.version,
      expectedRevisionId: meetingEmail.item.currentRevisionId,
      document: meetingEmail.document,
      sourceRefIds: Array.from({ length: 33 }, () => meetingEmail.item.id)
    }).success).toBe(false);
    expect(AppendItemRevisionInputSchema.safeParse({
      itemId: meetingEmail.item.id,
      expectedVersion: meetingEmail.item.version,
      expectedRevisionId: meetingEmail.item.currentRevisionId,
      document: meetingEmail.document,
      sourceRefIds: [meetingEmail.item.id, meetingEmail.item.id]
    }).success).toBe(false);
  });

  it("binds a revision write to both the expected version and revision", () => {
    const input = AppendItemRevisionInputSchema.parse({
      itemId: meetingEmail.item.id,
      expectedVersion: meetingEmail.item.version,
      expectedRevisionId: meetingEmail.item.currentRevisionId,
      document: meetingEmail.document
    });

    expect(input.expectedVersion).toBe(meetingEmail.item.version);
    expect(input.expectedRevisionId).toBe(meetingEmail.item.currentRevisionId);
    expect(input.sourceRefIds).toEqual([]);
  });

  it("validates persisted AI-job receipts and source health", () => {
    const now = "2026-08-30T21:00:00.000Z";
    expect(AiJobSchema.parse({
      id: "10101010-1010-4010-8010-101010101010",
      workspaceId: meetingEmail.item.workspaceId,
      itemId: meetingEmail.item.id,
      requestedByUserId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      instruction: "Find another day next week",
      origin: "inline_ask",
      priority: 50,
      status: "queued",
      queuedFor: "2026-08-30T22:00:00.000Z",
      resultSummary: null,
      resultPayload: {},
      attemptCount: 0,
      createdAt: now,
      startedAt: null,
      completedAt: null
    }).status).toBe("queued");

    expect(SourceHealthSchema.parse({
      id: "20202020-2020-4020-8020-202020202020",
      workspaceId: meetingEmail.item.workspaceId,
      sourceKey: "utsikt_operator",
      label: "Utsikt operator",
      status: "healthy",
      message: null,
      lastSuccessAt: now,
      lastCheckedAt: now,
      nextExpectedAt: "2026-08-30T22:00:00.000Z",
      metadata: {}
    }).status).toBe("healthy");
  });
});

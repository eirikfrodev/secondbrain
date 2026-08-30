import { describe, expect, it } from "vitest";

import {
  ItemDocumentV1Schema,
  ItemFixtureSchema,
  KnownItemBlockSchema,
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

import { ItemFixtureSchema, type ItemFixture } from "@utsikt/domain";

import athensWorkingJson from "../../../specs/fixtures/athens-working.json";
import hotelResearchJson from "../../../specs/fixtures/hotel-research.json";
import meetingEmailJson from "../../../specs/fixtures/meeting-email.json";
import passportRenewalJson from "../../../specs/fixtures/passport-renewal.json";
import projectResurfacingJson from "../../../specs/fixtures/project-resurfacing.json";
import stuckPdfJson from "../../../specs/fixtures/stuck-pdf.json";
import waitingForArchitectJson from "../../../specs/fixtures/waiting-for-architect.json";

export const meetingEmail = ItemFixtureSchema.parse(meetingEmailJson);
export const hotelResearch = ItemFixtureSchema.parse(hotelResearchJson);
export const waitingForArchitect = ItemFixtureSchema.parse(waitingForArchitectJson);
export const passportRenewal = ItemFixtureSchema.parse(passportRenewalJson);
export const athensWorking = ItemFixtureSchema.parse(athensWorkingJson);
export const stuckPdf = ItemFixtureSchema.parse(stuckPdfJson);
export const projectResurfacing = ItemFixtureSchema.parse(projectResurfacingJson);

export const fixtureItems: readonly ItemFixture[] = [
  meetingEmail,
  hotelResearch,
  waitingForArchitect,
  passportRenewal,
  athensWorking,
  stuckPdf,
  projectResurfacing
];

export function getFixtureById(id: string): ItemFixture | undefined {
  return fixtureItems.find((fixture) => fixture.item.id === id);
}

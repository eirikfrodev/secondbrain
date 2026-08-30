import type { ItemFixture } from "@utsikt/domain";
import { parseItemBlock } from "@utsikt/domain";
import {
  athensWorking,
  hotelResearch,
  meetingEmail,
  passportRenewal,
  projectResurfacing,
  stuckPdf,
  waitingForArchitect
} from "@utsikt/testing";

export const todayNeedsYou: readonly ItemFixture[] = [
  meetingEmail,
  hotelResearch,
  waitingForArchitect
];

export const todayInMotion = [
  {
    id: athensWorking.item.id,
    titleLead: "Athens",
    situation: "comparing 11 hotels within a kilometre of the marathon start.",
    state: "working" as const,
    meta: "working · since 08:15",
    origin: "you, tue 21:14 · reading booking sites — 7 of 11 done",
    progress: 64
  },
  {
    id: "insurance-queued",
    titleLead: "Insurance",
    situation: "reading both quotes against your current Gjensidige terms.",
    state: "queued" as const,
    meta: "queued · 09:40"
  },
  {
    id: projectResurfacing.item.id,
    titleLead: "Kitchen water filter",
    situation: "you asked me to reassess what you found in July.",
    state: "queued" as const,
    meta: "queued · 09:40"
  }
] as const;

export const todayWaiting = [
  { id: "andreas", titleLead: "Andreas", situation: "signed shareholder agreement, promised Monday.", meta: "2 days" },
  { id: "landlord", titleLead: "Landlord", situation: "deposit confirmation. I’ll nudge Friday if still quiet.", meta: "5 days" },
  { id: "tax", titleLead: "Skatteetaten", situation: "case 4471-B. Twelve days in; three weeks is typical.", meta: "12 days" }
] as const;

export const handledToday = [
  { id: "birthday", text: "Birthday greeting sent to Karoline.", undo: true, time: "08:02" },
  { id: "invoice", text: "Electrician’s invoice paid — 8 400 kr from joint account.", undo: false, time: "07:58" },
  { id: "webinar", text: "Declined the webinar invite from Kongsberg-gruppen, politely.", undo: false, time: "07:41" }
] as const;

export const todaySchedule = [
  { time: "09:30", title: "Product sync — Rune, Live", kind: "busy" },
  { time: "12:00", title: "Lunch with Mari — Kaffebrenneriet", kind: "busy" },
  { time: "14:00", title: "Dentist — Bogstadveien 54", detail: "leave 13:35 · bike 12 min", kind: "busy" },
  { time: "15:00", title: "Clear — good slot for the passport form", kind: "free" },
  { time: "17:00", title: "Insurance decision due today", kind: "deadline" }
] as const;

export const ahead = [
  { when: "Fri", title: "Electrician at the cabin, 08:00" },
  { when: "Mon", title: "Freelance invoice due — 31 500 kr" },
  { when: "Thu 4", title: "Marathon bib pickup closes" },
  { when: "Oct 7", title: "Passport expires in 41 days" }
] as const;

export const meetingCalendarEvidence = parseItemBlock({
  id: "calendar-evidence",
  type: "day_strip",
  schemaVersion: 1,
  fallbackText: "Thursday afternoon is clearer than Friday morning.",
  days: [
    { label: "Thu", date: "28", slots: ["09", "11", "13", "14", "16"] },
    { label: "Fri", date: "29", slots: ["09", "10", "11", "13", "15"] }
  ],
  proposedSlotId: "14"
});

export const unknownBlockFixture: ItemFixture = {
  item: {
    ...hotelResearch.item,
    id: "88888888-8888-4888-8888-888888888881",
    stableKey: "manual:unknown-block-regression",
    currentRevisionId: "88888888-8888-4888-8888-888888888882",
    titleLead: "Future content",
    situation: "contains a block this version does not know yet.",
    recommendation: "I would show its safe summary and keep the rest of the item usable."
  },
  document: {
    ...hotelResearch.document,
    spine: {
      ...hotelResearch.document.spine,
      titleLead: "Future content",
      situation: "contains a block this version does not know yet.",
      recommendation: "I would show its safe summary and keep the rest of the item usable.",
      stateLabel: "needs you"
    },
    blocks: [parseItemBlock({
      id: "future-map",
      type: "interactive_map_v2",
      schemaVersion: 1,
      fallbackText: "Three locations were found. Open the source when a reviewed map renderer is available."
    })],
    actionIds: []
  },
  actions: []
};

export const fixtureByShortName = {
  anders: meetingEmail,
  hotels: hotelResearch,
  architect: waitingForArchitect,
  passport: passportRenewal,
  athens: athensWorking,
  stuck: stuckPdf,
  water: projectResurfacing,
  unknown: unknownBlockFixture
} as const;

export const weekDays = [
  { day: "Mon", date: "25", load: 2, tone: "past", summary: ["Three meetings.", "9 items handled."] },
  { day: "Tue", date: "26", load: 5, tone: "past", summary: ["7 handled.", "Bjørnstad’s estimate didn’t come."] },
  { day: "Wed", date: "27", load: 4, tone: "today", summary: ["09:30 Product sync", "12:00 Lunch — Mari", "14:00 Dentist", "▲ Insurance decision — 17:00"] },
  { day: "Thu", date: "28", load: 6, tone: "heavy", summary: ["09:00 Leadership", "14:00 Anders pending", "15:30 Cabin call — Bjørnstad", "▲ Board pre-read due", "▲ DNB re-fixing closes"] },
  { day: "Fri", date: "29", load: 1, tone: "light", summary: ["08:00 Electrician at the cabin", "09:00 cabin call, moved?"] },
  { day: "Sat", date: "30", load: 0, tone: "normal", summary: ["09:00 Long run — 28 km"] },
  { day: "Sun", date: "31", load: 0, tone: "normal", summary: ["Clear."] }
] as const;

export const monthWeeks = [
  { label: "31 Aug–6 Sep", load: 82, note: "Heavy Thursday · two decisions", tone: "heavy" },
  { label: "7–13 Sep", load: 48, note: "Passport appointment · one clear afternoon", tone: "balanced" },
  { label: "14–20 Sep", load: 66, note: "Copenhagen · hotel decision closes", tone: "travel" },
  { label: "21–27 Sep", load: 34, note: "Two project reviews · otherwise light", tone: "light" },
  { label: "28 Sep–4 Oct", load: 57, note: "Invoice and marathon administration", tone: "balanced" }
] as const;

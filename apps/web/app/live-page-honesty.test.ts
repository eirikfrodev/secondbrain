import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const { requireProductPageAccessMock } = vi.hoisted(() => ({
  requireProductPageAccessMock: vi.fn()
}));

vi.mock("@/lib/auth/product-access", () => ({
  requireProductPageAccess: requireProductPageAccessMock
}));

import ActivityPage from "./activity/page";
import ItemPage from "./item/[id]/page";
import MonthPage from "./month/page";
import TodayPage from "./today/page";
import WeekPage from "./week/page";

beforeAll(() => vi.stubGlobal("React", React));
afterAll(() => vi.unstubAllGlobals());

describe("authenticated live product pages", () => {
  it.each([
    {
      name: "Today",
      fixtureCopy: "Three things need you",
      render: () => TodayPage()
    },
    {
      name: "Week",
      fixtureCopy: "Thursday is the heavy day",
      render: () => WeekPage()
    },
    {
      name: "Month",
      fixtureCopy: "Protect the final Friday",
      render: () => MonthPage()
    },
    {
      name: "Activity",
      fixtureCopy: "password-protected",
      render: () => ActivityPage()
    },
    {
      name: "Item",
      fixtureCopy: "Anders",
      render: () => ItemPage({ params: Promise.resolve({ id: "anders" }) })
    }
  ])("renders the honest $name state before any fixture projection", async ({
    fixtureCopy,
    render
  }) => {
    requireProductPageAccessMock.mockResolvedValue({
      mode: "supabase",
      liveAuthenticated: true,
      userId: "11111111-1111-4111-8111-111111111111",
      workspaceId: "22222222-2222-4222-8222-222222222222"
    });

    const markup = renderToStaticMarkup(await render());

    expect(markup).toContain("Your live workspace is ready.");
    expect(markup).toContain('action="/auth/sign-out"');
    expect(markup).not.toContain(fixtureCopy);
    expect(markup).not.toContain("Handled in mock mode");
  });
});

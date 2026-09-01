import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { LiveWorkspaceState } from "./live-workspace-state";

beforeAll(() => vi.stubGlobal("React", React));
afterAll(() => vi.unstubAllGlobals());

describe("live workspace state", () => {
  it("shows verified access without demo data, actions, or sync claims", () => {
    const markup = renderToStaticMarkup(
      React.createElement(LiveWorkspaceState, {
        active: "today",
        viewLabel: "Today"
      })
    );

    expect(markup).toContain("Your live workspace is ready.");
    expect(markup).toContain("no demo data is shown here");
    expect(markup).toContain("Pending the first authenticated read path");
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain('action="/auth/sign-out"');
    expect(markup).not.toContain("synced 08:52");
    expect(markup).not.toContain("Move it");
    expect(markup).not.toContain("Ask for anything");
  });
});

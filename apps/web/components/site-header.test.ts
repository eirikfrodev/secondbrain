import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { SiteHeader } from "./site-header";

beforeAll(() => vi.stubGlobal("React", React));
afterAll(() => vi.unstubAllGlobals());

describe("site header authentication controls", () => {
  it("does not offer sign-out in mock mode", () => {
    const markup = renderToStaticMarkup(React.createElement(SiteHeader));

    expect(markup).not.toContain("/auth/sign-out");
    expect(markup).not.toContain("Sign out");
    expect(markup).toContain("synced 08:52 · next 09:40");
  });

  it("offers an explicit POST sign-out only for verified live access", () => {
    const markup = renderToStaticMarkup(
      React.createElement(SiteHeader, { liveAuthenticated: true })
    );

    expect(markup).toContain('action="/auth/sign-out"');
    expect(markup).toContain('method="post"');
    expect(markup).toContain("Sign out");
    expect(markup).toContain("live workspace · data pending");
    expect(markup).not.toContain("synced 08:52 · next 09:40");
  });
});

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { GoogleSignInButtonView } from "./google-sign-in-button";

beforeAll(() => vi.stubGlobal("React", React));
afterAll(() => vi.unstubAllGlobals());

describe("Google sign-in button status", () => {
  it("exposes the pending OAuth navigation to assistive technology", () => {
    const markup = renderToStaticMarkup(
      React.createElement(GoogleSignInButtonView, {
        onStart: vi.fn(),
        starting: true
      })
    );

    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('aria-disabled="true"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('role="status"');
    expect(markup).toContain("Google sign-in is opening. Please wait.");
  });
});

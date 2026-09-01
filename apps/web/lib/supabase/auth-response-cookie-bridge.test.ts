import { NextRequest, NextResponse } from "next/server";
import { describe, expect, it } from "vitest";

import { createAuthResponseCookieBridge } from "./auth-response-cookie-bridge";

describe("Supabase auth response cookie bridge", () => {
  it("owns the final response cookies and preserves auth cache headers", () => {
    const request = new NextRequest("https://utsikt.test/auth/callback", {
      headers: { cookie: "existing=value" }
    });
    const bridge = createAuthResponseCookieBridge(request);

    bridge.cookies.setAll?.(
      [{
        name: "sb-session",
        value: "first",
        options: { httpOnly: true, sameSite: "lax", path: "/" }
      }],
      {
        "Cache-Control": "private, no-cache",
        "X-Auth-Result": "updated"
      }
    );
    bridge.cookies.setAll?.(
      [{
        name: "sb-session",
        value: "final",
        options: { httpOnly: true, sameSite: "lax", path: "/" }
      }],
      { Expires: "tomorrow" }
    );

    const response = bridge.applyTo(
      NextResponse.redirect("https://project.supabase.co/auth/v1/authorize")
    );

    expect(request.cookies.get("sb-session")?.value).toBe("final");
    expect(response.cookies.get("sb-session")?.value).toBe("final");
    expect(response.headers.get("x-auth-result")).toBe("updated");
    expect(response.headers.get("cache-control")).toContain("private");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("expires")).toBe("0");
    expect(response.headers.get("pragma")).toBe("no-cache");
  });

  it("marks an auth response private and no-store even without a cookie mutation", () => {
    const bridge = createAuthResponseCookieBridge(
      new NextRequest("https://utsikt.test/api/auth/google/start")
    );
    const response = bridge.applyTo(NextResponse.json({ ok: false }));

    expect(response.headers.get("cache-control")).toContain("private");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("expires")).toBe("0");
    expect(response.headers.get("pragma")).toBe("no-cache");
  });
});

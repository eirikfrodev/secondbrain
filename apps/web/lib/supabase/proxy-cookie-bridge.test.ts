import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { createProxyCookieBridge } from "./proxy-cookie-bridge";

describe("Supabase proxy cookie bridge", () => {
  it("copies refreshed cookies and mandatory cache headers to one response", () => {
    const request = new NextRequest("https://utsikt.test/today", {
      headers: { cookie: "existing=value" }
    });
    const bridge = createProxyCookieBridge(request);

    bridge.cookies.setAll?.(
      [{
        name: "sb-session",
        value: "refreshed",
        options: { httpOnly: true, sameSite: "lax", path: "/" }
      }],
      {
        "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
        Expires: "0",
        Pragma: "no-cache"
      }
    );

    expect(request.cookies.get("sb-session")?.value).toBe("refreshed");
    expect(bridge.response.cookies.get("sb-session")?.value).toBe("refreshed");
    expect(bridge.response.headers.get("cache-control")).toContain("no-store");
    expect(bridge.response.headers.get("expires")).toBe("0");
    expect(bridge.response.headers.get("pragma")).toBe("no-cache");
  });
});

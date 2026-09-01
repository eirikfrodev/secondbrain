import { describe, expect, it, vi } from "vitest";

import {
  createSupabaseCookieOptions,
  getBrowserApplicationOrigin
} from "./cookie-policy";

describe("Supabase cookie policy", () => {
  it("marks HTTPS application cookies Secure", () => {
    expect(createSupabaseCookieOptions("https://utsikt.example")).toEqual({
      secure: true
    });
  });

  it("keeps loopback HTTP usable for local development", () => {
    expect(createSupabaseCookieOptions("http://127.0.0.1:3000")).toEqual({
      secure: false
    });
  });

  it("uses the browser origin when one is available", () => {
    vi.stubGlobal("location", { origin: "https://app.example" });

    expect(getBrowserApplicationOrigin("https://project.supabase.co")).toBe(
      "https://app.example"
    );

    vi.unstubAllGlobals();
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";

const { createBrowserClientMock } = vi.hoisted(() => ({
  createBrowserClientMock: vi.fn()
}));

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: createBrowserClientMock
}));

import { createBrowserDataClient } from "./browser";

const originalEnvironment = {
  mode: process.env.NEXT_PUBLIC_CONNECTOR_MODE,
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
};

function restoreEnvironment(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

afterEach(() => {
  createBrowserClientMock.mockReset();
  vi.unstubAllGlobals();
  restoreEnvironment("NEXT_PUBLIC_CONNECTOR_MODE", originalEnvironment.mode);
  restoreEnvironment("NEXT_PUBLIC_SUPABASE_URL", originalEnvironment.url);
  restoreEnvironment("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", originalEnvironment.key);
});

describe("browser data client", () => {
  it("does not construct a Supabase client in mock mode", () => {
    process.env.NEXT_PUBLIC_CONNECTOR_MODE = "mock";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    expect(createBrowserDataClient()).toEqual({ mode: "mock" });
    expect(createBrowserClientMock).not.toHaveBeenCalled();
  });

  it("uses Secure cookies for an HTTPS browser origin in live mode", () => {
    process.env.NEXT_PUBLIC_CONNECTOR_MODE = "supabase";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    vi.stubGlobal("location", { origin: "https://utsikt.example" });
    const client = { auth: {} };
    createBrowserClientMock.mockReturnValue(client);

    expect(createBrowserDataClient()).toEqual({ mode: "supabase", client });
    expect(createBrowserClientMock).toHaveBeenCalledWith(
      "https://project.supabase.co",
      "sb_publishable_test",
      { cookieOptions: { secure: true } }
    );
  });
});

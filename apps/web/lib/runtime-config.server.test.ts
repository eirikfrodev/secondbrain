import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getServerMutationAppOrigin } from "./runtime-config.server";

afterEach(() => vi.unstubAllEnvs());

describe("server mutation application origin", () => {
  it("uses the validated request origin in credential-free mock mode", () => {
    vi.stubEnv("CONNECTOR_MODE", "mock");
    vi.stubEnv("NEXT_PUBLIC_CONNECTOR_MODE", "mock");
    vi.stubEnv("APP_ORIGIN", "");

    expect(
      getServerMutationAppOrigin("http://127.0.0.1:3100/api/ask")
    ).toBe("http://127.0.0.1:3100");
  });

  it("uses only configured APP_ORIGIN in live mode", () => {
    vi.stubEnv("CONNECTOR_MODE", "supabase");
    vi.stubEnv("NEXT_PUBLIC_CONNECTOR_MODE", "supabase");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "sb_publishable_runtime_test"
    );
    vi.stubEnv("APP_ORIGIN", "https://utsikt.example");

    expect(
      getServerMutationAppOrigin("https://attacker.example/api/ask")
    ).toBe("https://utsikt.example");
  });
});

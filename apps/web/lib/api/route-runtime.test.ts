import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { resolveAiJobMutationRouteRuntime } from "./route-runtime";

afterEach(() => vi.unstubAllEnvs());

function useMockMode(nodeEnvironment: "development" | "production" | "test") {
  vi.stubEnv("NODE_ENV", nodeEnvironment);
  vi.stubEnv("CONNECTOR_MODE", "mock");
  vi.stubEnv("NEXT_PUBLIC_CONNECTOR_MODE", "mock");
  vi.stubEnv("APP_ORIGIN", "");
}

describe("AI job mutation route runtime", () => {
  it.each(["development", "test"] as const)(
    "enables process-local mock mutations on loopback in %s",
    (nodeEnvironment) => {
      useMockMode(nodeEnvironment);

      expect(
        resolveAiJobMutationRouteRuntime("http://localhost:3100/api/ask")
      ).toEqual({ enabled: true, appOrigin: "http://localhost:3100" });
    }
  );

  it("disables mock mutations in a production runtime", async () => {
    useMockMode("production");

    const runtime = resolveAiJobMutationRouteRuntime(
      "http://localhost:3000/api/ask"
    );

    expect(runtime.enabled).toBe(false);
    if (runtime.enabled) return;
    expect(runtime.response.status).toBe(404);
    await expect(runtime.response.json()).resolves.toEqual({
      error: {
        code: "not_found",
        message: "The resource was not found."
      }
    });
  });

  it("disables mock mutations on a non-loopback origin", async () => {
    useMockMode("development");

    const runtime = resolveAiJobMutationRouteRuntime(
      "https://preview.example/api/ask"
    );

    expect(runtime.enabled).toBe(false);
    if (runtime.enabled) return;
    expect(runtime.response.status).toBe(404);
  });

  it("fails closed for a non-loopback HTTP mock request", async () => {
    useMockMode("development");

    const runtime = resolveAiJobMutationRouteRuntime(
      "http://192.0.2.10/api/ask"
    );

    expect(runtime.enabled).toBe(false);
    if (runtime.enabled) return;
    expect(runtime.response.status).toBe(404);
  });

  it("keeps live mutations enabled with only configured APP_ORIGIN", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CONNECTOR_MODE", "supabase");
    vi.stubEnv("NEXT_PUBLIC_CONNECTOR_MODE", "supabase");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "sb_publishable_route_runtime_test"
    );
    vi.stubEnv("APP_ORIGIN", "https://utsikt.example");

    expect(
      resolveAiJobMutationRouteRuntime("https://attacker.example/api/ask")
    ).toEqual({ enabled: true, appOrigin: "https://utsikt.example" });
  });
});

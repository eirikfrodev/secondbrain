import { describe, expect, it } from "vitest";

import {
  resolvePublicRuntimeConfig,
  resolveAppOrigin,
  resolveServerRuntimeConfig,
  RuntimeConfigurationError
} from "./runtime-config";

const supabaseEnvironment = {
  connectorMode: "supabase",
  supabaseUrl: "https://example.supabase.co",
  publishableKey: "sb_publishable_example"
};

describe("runtime configuration", () => {
  it.each([
    ["https://utsikt.example", "https://utsikt.example"],
    ["https://utsikt.example/", "https://utsikt.example"],
    ["http://127.0.0.1:3000", "http://127.0.0.1:3000"],
    ["http://localhost:3000", "http://localhost:3000"]
  ])("accepts an exact application origin", (value, expected) => {
    expect(resolveAppOrigin(value)).toBe(expected);
  });

  it.each([
    undefined,
    "",
    "http://utsikt.example",
    "https://utsikt.example/auth/callback",
    "https://utsikt.example?next=elsewhere",
    "https://user:password@utsikt.example",
    "file:///tmp/utsikt"
  ])("rejects a missing or unsafe application origin", (value) => {
    expect(() => resolveAppOrigin(value)).toThrow(
      "APP_ORIGIN must be an HTTPS origin or a loopback HTTP origin."
    );
  });

  it("defaults to credential-free mock mode", () => {
    expect(resolvePublicRuntimeConfig({})).toEqual({ mode: "mock" });
    expect(resolveServerRuntimeConfig({})).toEqual({ mode: "mock" });
  });

  it("does not require Supabase values in explicit mock mode", () => {
    expect(resolveServerRuntimeConfig({
      serverConnectorMode: "mock",
      connectorMode: "mock"
    })).toEqual({ mode: "mock" });
  });

  it("returns only validated public values in Supabase mode", () => {
    expect(resolvePublicRuntimeConfig(supabaseEnvironment)).toEqual({
      mode: "supabase",
      supabaseUrl: "https://example.supabase.co",
      publishableKey: "sb_publishable_example"
    });
  });

  it.each([
    ["https://example.supabase.co/", "https://example.supabase.co"],
    ["http://127.0.0.1:54321", "http://127.0.0.1:54321"],
    ["http://localhost:54321/", "http://localhost:54321"]
  ])("accepts and normalizes a safe Supabase origin", (supabaseUrl, expected) => {
    expect(resolvePublicRuntimeConfig({
      connectorMode: "supabase",
      supabaseUrl,
      publishableKey: supabaseEnvironment.publishableKey
    })).toEqual({
      mode: "supabase",
      supabaseUrl: expected,
      publishableKey: supabaseEnvironment.publishableKey
    });
  });

  it.each([
    { connectorMode: "supabase" },
    {
      connectorMode: "supabase",
      supabaseUrl: "https://example.supabase.co"
    },
    {
      connectorMode: "supabase",
      publishableKey: "sb_publishable_example"
    },
    {
      connectorMode: "supabase",
      supabaseUrl: "file:///tmp/project",
      publishableKey: "sb_publishable_example"
    },
    {
      connectorMode: "supabase",
      supabaseUrl: "http://example.supabase.co",
      publishableKey: "sb_publishable_example"
    },
    {
      connectorMode: "supabase",
      supabaseUrl: "https://example.supabase.co/auth/v1",
      publishableKey: "sb_publishable_example"
    },
    {
      connectorMode: "supabase",
      supabaseUrl: "https://user:password@example.supabase.co",
      publishableKey: "sb_publishable_example"
    }
  ])("fails closed for incomplete or invalid live configuration", (environment) => {
    expect(() => resolvePublicRuntimeConfig(environment)).toThrow(RuntimeConfigurationError);
  });

  it("rejects different server and browser modes", () => {
    expect(() => resolveServerRuntimeConfig({
      serverConnectorMode: "supabase",
      connectorMode: "mock",
      supabaseUrl: supabaseEnvironment.supabaseUrl,
      publishableKey: supabaseEnvironment.publishableKey
    })).toThrow("Server and browser connector modes must match.");
  });

  it("requires live mode to be visible to the browser build", () => {
    expect(() => resolveServerRuntimeConfig({
      serverConnectorMode: "supabase",
      supabaseUrl: supabaseEnvironment.supabaseUrl,
      publishableKey: supabaseEnvironment.publishableKey
    })).toThrow("Supabase mode must be enabled explicitly for both server and browser.");
    expect(() => resolveServerRuntimeConfig({
      connectorMode: "supabase",
      supabaseUrl: supabaseEnvironment.supabaseUrl,
      publishableKey: supabaseEnvironment.publishableKey
    })).toThrow("Supabase mode must be enabled explicitly for both server and browser.");
  });

  it.each([
    "sb_secret_do_not_bundle",
    "eyJhbGciOiJIUzI1NiJ9.legacy-service-role-jwt.signature",
    "plain-text-key"
  ])("rejects a non-publishable browser key", (publishableKey) => {
    expect(() => resolvePublicRuntimeConfig({
      connectorMode: "supabase",
      supabaseUrl: supabaseEnvironment.supabaseUrl,
      publishableKey
    })).toThrow("The public Supabase key must use the sb_publishable_ format.");
  });

  it("rejects a secret-shaped public key even when mock mode is active", () => {
    expect(() => resolveServerRuntimeConfig({
      serverConnectorMode: "mock",
      connectorMode: "mock",
      publishableKey: "sb_secret_do_not_bundle"
    })).toThrow("The public Supabase key must use the sb_publishable_ format.");
  });

  it("does not include configuration values in failure messages", () => {
    const secretLikeValue = "sb_publishable_do_not_echo_this_value";

    expect(() => resolvePublicRuntimeConfig({
      connectorMode: "supabase",
      supabaseUrl: "not a URL",
      publishableKey: secretLikeValue
    })).toThrow("Supabase mode requires a valid public URL and publishable key.");

    try {
      resolvePublicRuntimeConfig({
        connectorMode: "supabase",
        supabaseUrl: "not a URL",
        publishableKey: secretLikeValue
      });
    } catch (cause) {
      expect((cause as Error).message).not.toContain(secretLikeValue);
      expect(JSON.stringify(cause)).not.toContain(secretLikeValue);
    }
  });
});

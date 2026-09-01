import { describe, expect, it } from "vitest";

import { parseVerifiedSession, readVerifiedSession } from "./claims";

const userId = "11111111-1111-4111-8111-111111111111";
const sessionId = "22222222-2222-4222-8222-222222222222";
const supabaseUrl = "https://example.supabase.co";
const validClaims = {
  sub: userId,
  iss: `${supabaseUrl}/auth/v1`,
  aud: "authenticated",
  exp: 1_800_000_000,
  iat: 1_700_000_000,
  role: "authenticated",
  aal: "aal1",
  session_id: sessionId,
  is_anonymous: false,
  app_metadata: { provider: "google", providers: ["google"] },
  amr: [{ method: "oauth", timestamp: 1_700_000_000 }]
};

describe("verified Supabase claims", () => {
  it("returns only the validated user identity", () => {
    expect(parseVerifiedSession({
      data: {
        claims: {
          ...validClaims,
          email: "not-forwarded@example.com",
        },
        header: { alg: "ES256" }
      },
      error: null
    }, supabaseUrl)).toEqual({ userId });
  });

  it("accepts the RFC-style string form of the OAuth authentication method", () => {
    expect(parseVerifiedSession({
      data: { claims: { ...validClaims, amr: ["oauth"] } },
      error: null
    }, supabaseUrl)).toEqual({ userId });
  });

  it.each([
    { data: null, error: null },
    { data: { claims: { ...validClaims, sub: "not-a-uuid" } }, error: null },
    { data: { claims: validClaims }, error: new Error("expired") },
    { data: { claims: null }, error: null },
    { unexpected: true }
  ])("returns null for missing, invalid, or failed claims", (result) => {
    expect(parseVerifiedSession(result, supabaseUrl)).toBeNull();
  });

  it.each([
    { ...validClaims, iss: "https://another-project.supabase.co/auth/v1" },
    { ...validClaims, aud: "anon" },
    { ...validClaims, role: "service_role" },
    { ...validClaims, session_id: "not-a-uuid" },
    { ...validClaims, is_anonymous: true },
    { ...validClaims, is_anonymous: undefined },
    {
      ...validClaims,
      app_metadata: { provider: "email", providers: ["email", "google"] }
    },
    { ...validClaims, amr: [{ method: "password", timestamp: 1_700_000_000 }] },
    { ...validClaims, amr: undefined }
  ])("rejects claims that are not an authenticated project session", (claims) => {
    expect(parseVerifiedSession({
      data: { claims },
      error: null
    }, supabaseUrl)).toBeNull();
  });

  it("returns null when claim verification throws", async () => {
    await expect(readVerifiedSession({
      getClaims: async () => {
        throw new Error("network failure");
      }
    }, supabaseUrl)).resolves.toBeNull();
  });
});

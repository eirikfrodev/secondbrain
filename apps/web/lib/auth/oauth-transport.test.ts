import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CoreDatabase } from "@utsikt/db";
import { Buffer } from "node:buffer";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createResponseOwningServerSupabaseClient,
  type ResponseOwningSupabaseClient
} from "../supabase/auth-response";
import { createAuthResponseCookieBridge } from "../supabase/auth-response-cookie-bridge";
import {
  completeGoogleOAuth,
  signOutLocally,
  startGoogleOAuth
} from "./oauth-transport";

const appOrigin = "https://utsikt.test";
const supabaseUrl = "https://project.supabase.co";
const userId = "11111111-1111-4111-8111-111111111111";
const otherUserId = "33333333-3333-4333-8333-333333333333";
const workspaceId = "22222222-2222-4222-8222-222222222222";
const pkceChallenge = "a".repeat(43);
const pkceFlowId = "f".repeat(32);

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function callbackUrl(code: string, flowId = pkceFlowId): string {
  const url = new URL("/auth/callback", appOrigin);
  url.searchParams.set("code", code);
  url.searchParams.set("sb_flow_id", flowId);
  return url.toString();
}

function unsignedAccessToken(): string {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");

  return [
    encode({ alg: "none", typ: "JWT" }),
    encode({
      sub: userId,
      aud: "authenticated",
      role: "authenticated",
      exp: Math.floor(Date.now() / 1_000) + 3_600
    }),
    "c2ln"
  ].join(".");
}

function readChunkedSessionCookie(
  cookies: ReadonlyMap<string, string>,
  storageKey: string
): unknown {
  const unchunked = cookies.get(storageKey);
  let encoded = unchunked ?? "";

  if (unchunked === undefined) {
    for (let index = 0; cookies.has(`${storageKey}.${index}`); index += 1) {
      encoded += cookies.get(`${storageKey}.${index}`);
    }
  }

  expect(encoded.startsWith("base64-")).toBe(true);
  return JSON.parse(
    Buffer.from(encoded.slice("base64-".length), "base64url").toString("utf8")
  );
}

function buildAuthorizationUrl(options: {
  origin?: string;
  pathname?: string;
  overrides?: Record<string, string>;
  omit?: string;
  extra?: Record<string, string>;
} = {}): string {
  const url = new URL(options.pathname ?? "/auth/v1/authorize", options.origin ?? supabaseUrl);
  const parameters = {
    provider: "google",
    redirect_to: `${appOrigin}/auth/callback?sb_flow_id=${pkceFlowId}`,
    scopes: "openid email profile",
    prompt: "select_account",
    code_challenge: pkceChallenge,
    code_challenge_method: "s256",
    ...options.overrides
  };

  for (const [key, value] of Object.entries(parameters)) {
    if (key !== options.omit) {
      url.searchParams.set(key, value);
    }
  }
  for (const [key, value] of Object.entries(options.extra ?? {})) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}

const googleAuthorizationUrl = buildAuthorizationUrl();

const googleUser = {
  id: userId,
  email: "owner@example.test",
  is_anonymous: false,
  app_metadata: { provider: "google", providers: ["google"] },
  identities: [{ provider: "google" }]
};

type Harness = {
  dependencies: {
    appOrigin: string;
    supabaseUrl: string;
    createClient: ReturnType<typeof vi.fn>;
  };
  context: ResponseOwningSupabaseClient;
  signInWithOAuth: ReturnType<typeof vi.fn>;
  exchangeCodeForSession: ReturnType<typeof vi.fn>;
  setSession: ReturnType<typeof vi.fn>;
  getUser: ReturnType<typeof vi.fn>;
  signOut: ReturnType<typeof vi.fn>;
  from: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  applyTo: ReturnType<typeof vi.fn>;
};

function createHarness(): Harness {
  const signInWithOAuth = vi.fn().mockResolvedValue({
    data: { provider: "google", url: googleAuthorizationUrl, flowId: pkceFlowId },
    error: null
  });
  const exchangeCodeForSession = vi.fn().mockResolvedValue({
    data: {
      session: {
        access_token: "access-token",
        refresh_token: "refresh-token",
        user: { id: userId },
        provider_token: "must-not-be-persisted",
        provider_refresh_token: "must-not-be-persisted-either"
      },
      user: { id: userId }
    },
    error: null
  });
  const setSession = vi.fn().mockResolvedValue({
    data: {
      session: {
        access_token: "access-token",
        refresh_token: "refresh-token",
        user: { id: userId }
      },
      user: { id: userId }
    },
    error: null
  });
  const getUser = vi.fn().mockResolvedValue({
    data: { user: googleUser },
    error: null
  });
  const signOut = vi.fn().mockResolvedValue({ error: null });
  const limit = vi.fn().mockResolvedValue({
    data: [{ id: workspaceId, owner_user_id: userId, kind: "personal" }],
    error: null
  });
  const query = {
    eq: vi.fn(),
    limit
  };
  query.eq.mockReturnValue(query);
  const select = vi.fn().mockReturnValue(query);
  const from = vi.fn().mockReturnValue({ select });
  const client = {
    auth: { signInWithOAuth, exchangeCodeForSession, setSession, getUser, signOut },
    from
  } as unknown as SupabaseClient<CoreDatabase>;
  const applyTo = vi.fn((response) => {
    response.headers.set("x-auth-response-applied", "true");
    response.headers.set("cache-control", "private, no-store");
    return response;
  });
  const context = { client, applyTo };
  const createClient = vi.fn().mockReturnValue(context);

  return {
    dependencies: { appOrigin, supabaseUrl, createClient },
    context,
    signInWithOAuth,
    exchangeCodeForSession,
    setSession,
    getUser,
    signOut,
    from,
    select,
    eq: query.eq,
    limit,
    applyTo
  };
}

describe("Google OAuth initiation", () => {
  it("accepts the PKCE authorization contract generated by the installed SSR SDK", async () => {
    const request = new NextRequest(`${appOrigin}/api/auth/google/start`, {
      headers: { "sec-fetch-site": "same-origin" }
    });
    const bridge = createAuthResponseCookieBridge(request);
    const client = createServerClient<CoreDatabase>(
      supabaseUrl,
      "sb_publishable_test",
      {
        auth: {
          experimental: { appendPkceFlowIdToRedirects: true }
        },
        cookieOptions: { secure: true },
        cookies: bridge.cookies
      }
    );

    const response = await startGoogleOAuth(request, {
      appOrigin,
      supabaseUrl,
      createClient: () => ({
        client,
        applyTo: (candidate) => bridge.applyTo(candidate)
      })
    });
    const authorizationUrl = new URL(response.headers.get("location") ?? "");

    expect(response.status).toBe(307);
    expect(authorizationUrl.origin).toBe(supabaseUrl);
    expect(authorizationUrl.pathname).toBe("/auth/v1/authorize");
    expect(authorizationUrl.searchParams.get("provider")).toBe("google");
    expect(authorizationUrl.searchParams.get("scopes")).toBe("openid email profile");
    expect(authorizationUrl.searchParams.get("code_challenge_method")).toBe("s256");
    expect(authorizationUrl.searchParams.get("redirect_to")).toMatch(
      /^https:\/\/utsikt\.test\/auth\/callback\?sb_flow_id=[A-Za-z0-9_-]{8,64}$/
    );
    expect(response.cookies.getAll().length).toBeGreaterThan(0);
    expect(response.headers.get("set-cookie")).toContain("Secure");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("starts one fixed server-side Google PKCE flow with identity-only scopes", async () => {
    const harness = createHarness();
    const request = new NextRequest(`${appOrigin}/api/auth/google/start`, {
      headers: { "sec-fetch-site": "same-origin" }
    });

    const response = await startGoogleOAuth(request, harness.dependencies);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(googleAuthorizationUrl);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(harness.signInWithOAuth).toHaveBeenCalledTimes(1);
    expect(harness.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        queryParams: { prompt: "select_account" },
        redirectTo: `${appOrigin}/auth/callback`,
        scopes: "openid email profile",
        skipBrowserRedirect: true
      }
    });
  });

  it.each<{ url: string; headers: Record<string, string> }>([
    { url: `${appOrigin}/api/auth/google/start?provider=github`, headers: {} },
    { url: "https://lookalike.test/api/auth/google/start", headers: {} },
    {
      url: `${appOrigin}/api/auth/google/start`,
      headers: { "sec-fetch-site": "cross-site" }
    },
    {
      url: `${appOrigin}/api/auth/google/start`,
      headers: { origin: "https://lookalike.test" }
    }
  ])("rejects caller-controlled or cross-site initiation input", async ({ url, headers }) => {
    const harness = createHarness();
    const response = await startGoogleOAuth(
      new NextRequest(url, { headers }),
      harness.dependencies
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      `${appOrigin}/sign-in?error=google_sign_in_failed`
    );
    expect(harness.signInWithOAuth).not.toHaveBeenCalled();
  });

  it.each([
    buildAuthorizationUrl({ origin: "https://project.supabase.co.attacker.test" }),
    buildAuthorizationUrl({ pathname: "/auth/v1/token" }),
    buildAuthorizationUrl({ overrides: { provider: "github" } }),
    buildAuthorizationUrl({ overrides: { redirect_to: `${appOrigin}/other` } }),
    buildAuthorizationUrl({ overrides: { scopes: "openid email profile calendar" } }),
    buildAuthorizationUrl({ overrides: { prompt: "consent" } }),
    buildAuthorizationUrl({ omit: "code_challenge" }),
    buildAuthorizationUrl({ overrides: { code_challenge_method: "plain" } }),
    buildAuthorizationUrl({ extra: { next: "https://attacker.test" } })
  ])("refuses a malformed or non-Supabase authorization redirect", async (url) => {
    const harness = createHarness();
    harness.signInWithOAuth.mockResolvedValue({
      data: { provider: "google", url, flowId: pkceFlowId },
      error: null
    });

    const response = await startGoogleOAuth(
      new NextRequest(`${appOrigin}/api/auth/google/start`),
      harness.dependencies
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      `${appOrigin}/sign-in?error=google_sign_in_failed`
    );
  });

  it("refuses a configured non-loopback HTTP authorization origin", async () => {
    const harness = createHarness();
    harness.dependencies.supabaseUrl = "http://project.supabase.co";
    harness.signInWithOAuth.mockResolvedValue({
      data: {
        provider: "google",
        url: buildAuthorizationUrl({ origin: "http://project.supabase.co" }),
        flowId: pkceFlowId
      },
      error: null
    });

    const response = await startGoogleOAuth(
      new NextRequest(`${appOrigin}/api/auth/google/start`),
      harness.dependencies
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      `${appOrigin}/sign-in?error=google_sign_in_failed`
    );
  });
});

describe("Google OAuth callback", () => {
  it("removes upstream provider credentials from the final pinned-SDK session cookie", async () => {
    const providerToken = "PROVIDER_TOKEN_SENTINEL";
    const providerRefreshToken = "PROVIDER_REFRESH_SENTINEL";
    const accessToken = unsignedAccessToken();
    const cookieJar = new Map<string, string>();
    let tokenExchangeBody: Record<string, unknown> | null = null;
    const sdkFetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const request = new Request(input, init);
      const url = new URL(request.url);
      const json = (value: unknown) => new Response(JSON.stringify(value), {
        status: 200,
        headers: { "content-type": "application/json" }
      });

      if (
        request.method === "POST" &&
        url.pathname === "/auth/v1/token" &&
        url.searchParams.get("grant_type") === "pkce"
      ) {
        tokenExchangeBody = await request.json() as Record<string, unknown>;
        return json({
          access_token: accessToken,
          refresh_token: "refresh-token",
          expires_in: 3_600,
          token_type: "bearer",
          user: googleUser,
          provider_token: providerToken,
          provider_refresh_token: providerRefreshToken
        });
      }

      if (request.method === "GET" && url.pathname === "/auth/v1/user") {
        return json(googleUser);
      }

      if (request.method === "GET" && url.pathname === "/rest/v1/workspaces") {
        return json([{ id: workspaceId, owner_user_id: userId, kind: "personal" }]);
      }

      throw new Error(`Unexpected SDK request: ${request.method} ${url.pathname}`);
    });

    vi.stubEnv("CONNECTOR_MODE", "supabase");
    vi.stubEnv("NEXT_PUBLIC_CONNECTOR_MODE", "supabase");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", supabaseUrl);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    vi.stubEnv("APP_ORIGIN", appOrigin);
    vi.stubGlobal("fetch", sdkFetch);
    const dependencies = {
      appOrigin,
      supabaseUrl,
      createClient: createResponseOwningServerSupabaseClient
    };

    const startRequest = new NextRequest(`${appOrigin}/api/auth/google/start`, {
      headers: { "sec-fetch-site": "same-origin" }
    });
    const startResponse = await startGoogleOAuth(startRequest, dependencies);
    for (const cookie of startResponse.cookies.getAll()) {
      cookieJar.set(cookie.name, cookie.value);
    }
    const authorizationUrl = new URL(startResponse.headers.get("location") ?? "");
    const redirectTo = new URL(authorizationUrl.searchParams.get("redirect_to") ?? "");
    const flowId = redirectTo.searchParams.get("sb_flow_id");

    expect(flowId).toMatch(/^[A-Za-z0-9_-]{8,64}$/);

    const callbackRequest = new NextRequest(callbackUrl("valid-code", flowId ?? ""), {
      headers: {
        cookie: [...cookieJar]
          .map(([name, value]) => `${name}=${value}`)
          .join("; ")
      }
    });
    const callbackResponse = await completeGoogleOAuth(callbackRequest, dependencies);

    for (const cookie of callbackResponse.cookies.getAll()) {
      if (cookie.value === "" || cookie.maxAge === 0) {
        cookieJar.delete(cookie.name);
      } else {
        cookieJar.set(cookie.name, cookie.value);
      }
    }

    expect(callbackResponse.status).toBe(303);
    expect(callbackResponse.headers.get("location")).toBe(`${appOrigin}/today`);
    expect(tokenExchangeBody).toMatchObject({
      auth_code: "valid-code",
      code_verifier: expect.any(String)
    });
    const capturedExchangeBody = tokenExchangeBody as unknown as Record<string, unknown>;
    expect((capturedExchangeBody.code_verifier as string).length).toBeGreaterThan(20);

    const session = readChunkedSessionCookie(cookieJar, "sb-project-auth-token") as
      Record<string, unknown>;
    expect(session.access_token).toBe(accessToken);
    expect(session.refresh_token).toBe("refresh-token");
    expect(session).not.toHaveProperty("provider_token");
    expect(session).not.toHaveProperty("provider_refresh_token");
    expect(JSON.stringify(session)).not.toContain(providerToken);
    expect(JSON.stringify(session)).not.toContain(providerRefreshToken);
    expect(callbackResponse.headers.get("set-cookie")).not.toContain(providerToken);
    expect(callbackResponse.headers.get("set-cookie")).not.toContain(providerRefreshToken);
    expect([...cookieJar.keys()].some((name) =>
      name.includes(`flow-${flowId ?? ""}-code-verifier`)
    )).toBe(false);

    const finalSessionCookies = callbackResponse.cookies.getAll().filter((cookie) =>
      cookie.name === "sb-project-auth-token" ||
      cookie.name.startsWith("sb-project-auth-token.")
    );
    expect(finalSessionCookies.length).toBeGreaterThan(0);
    for (const cookie of finalSessionCookies.filter((candidate) => candidate.value !== "")) {
      expect(cookie.secure).toBe(true);
      expect(cookie.sameSite).toBe("lax");
      expect(cookie.path).toBe("/");
      expect(cookie.domain).toBeUndefined();
      expect(cookie.httpOnly).toBe(false);
      expect(cookie.maxAge).toBeGreaterThan(0);
    }
  });

  it("exchanges one strict code and admits only an RLS-visible personal owner", async () => {
    const harness = createHarness();
    const response = await completeGoogleOAuth(
      new NextRequest(callbackUrl("valid_code-123")),
      harness.dependencies
    );

    expect(harness.exchangeCodeForSession).toHaveBeenCalledWith(
      "valid_code-123",
      { flowId: pkceFlowId }
    );
    expect(harness.setSession).toHaveBeenCalledWith({
      access_token: "access-token",
      refresh_token: "refresh-token"
    });
    expect(harness.getUser).toHaveBeenCalledTimes(1);
    expect(harness.from).toHaveBeenCalledWith("workspaces");
    expect(harness.select).toHaveBeenCalledWith("id,owner_user_id,kind");
    expect(harness.eq).toHaveBeenNthCalledWith(1, "owner_user_id", userId);
    expect(harness.eq).toHaveBeenNthCalledWith(2, "kind", "personal");
    expect(harness.limit).toHaveBeenCalledWith(2);
    expect(harness.signOut).not.toHaveBeenCalled();
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`${appOrigin}/today`);
  });

  it.each([
    `${appOrigin}/auth/callback`,
    `${appOrigin}/auth/callback?code=valid`,
    `${appOrigin}/auth/callback?code=one&code=two&sb_flow_id=${pkceFlowId}`,
    `${appOrigin}/auth/callback?code=valid&sb_flow_id=${pkceFlowId}&next=https%3A%2F%2Fevil.test`,
    `${appOrigin}/auth/callback?code=contains%20space&sb_flow_id=${pkceFlowId}`,
    `${appOrigin}/auth/callback?code=valid&sb_flow_id=short`,
    `${appOrigin}/auth/callback?code=valid&sb_flow_id=${pkceFlowId}&sb_flow_id=${pkceFlowId}`,
    `https://lookalike.test/auth/callback?code=valid&sb_flow_id=${pkceFlowId}`
  ])("rejects malformed callback input without mutating an existing session", async (url) => {
    const harness = createHarness();
    const response = await completeGoogleOAuth(
      new NextRequest(url),
      harness.dependencies
    );

    expect(harness.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(harness.signOut).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      `${appOrigin}/sign-in?error=google_sign_in_failed`
    );
  });

  it("does not turn an exchange failure into a cross-site logout", async () => {
    const harness = createHarness();
    harness.exchangeCodeForSession.mockResolvedValue({
      data: { session: null },
      error: new Error("expired code")
    });

    const response = await completeGoogleOAuth(
      new NextRequest(callbackUrl("expired")),
      harness.dependencies
    );

    expect(harness.getUser).not.toHaveBeenCalled();
    expect(harness.signOut).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      `${appOrigin}/sign-in?error=google_sign_in_failed`
    );
  });

  it.each([
    { data: { session: null, user: { id: userId } }, error: null },
    { data: {}, error: null }
  ])("clears a possibly established session when exchange data is malformed", async (result) => {
    const harness = createHarness();
    harness.exchangeCodeForSession.mockResolvedValue(result);

    const response = await completeGoogleOAuth(
      new NextRequest(callbackUrl("malformed-result")),
      harness.dependencies
    );

    expect(harness.getUser).not.toHaveBeenCalled();
    expect(harness.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(response.headers.get("location")).toBe(
      `${appOrigin}/sign-in?error=google_sign_in_failed`
    );
  });

  it("does not sign out an existing session when the exchange throws", async () => {
    const harness = createHarness();
    harness.exchangeCodeForSession.mockRejectedValue(new Error("network unavailable"));

    const response = await completeGoogleOAuth(
      new NextRequest(callbackUrl("unexchangeable")),
      harness.dependencies
    );

    expect(harness.getUser).not.toHaveBeenCalled();
    expect(harness.signOut).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      `${appOrigin}/sign-in?error=google_sign_in_failed`
    );
  });

  it("clears a candidate if the sanitized Supabase session still contains provider credentials", async () => {
    const harness = createHarness();
    harness.setSession.mockResolvedValue({
      data: {
        session: {
          access_token: "access-token",
          refresh_token: "refresh-token",
          user: { id: userId },
          provider_token: "provider-secret"
        },
        user: { id: userId }
      },
      error: null
    });

    const response = await completeGoogleOAuth(
      new NextRequest(callbackUrl("unsafe-session")),
      harness.dependencies
    );

    expect(harness.getUser).not.toHaveBeenCalled();
    expect(harness.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(response.headers.get("location")).toBe(
      `${appOrigin}/sign-in?error=google_sign_in_failed`
    );
  });

  it("clears a successfully exchanged anonymous candidate", async () => {
    const harness = createHarness();
    harness.getUser.mockResolvedValue({
      data: {
        user: {
          ...googleUser,
          is_anonymous: true,
          app_metadata: { provider: "google", providers: ["google"] }
        }
      },
      error: null
    });

    const response = await completeGoogleOAuth(
      new NextRequest(callbackUrl("valid")),
      harness.dependencies
    );

    expect(harness.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(harness.from).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      `${appOrigin}/sign-in?error=google_sign_in_failed`
    );
  });

  it("clears a successfully exchanged non-Google candidate", async () => {
    const harness = createHarness();
    harness.getUser.mockResolvedValue({
      data: {
        user: {
          ...googleUser,
          app_metadata: { provider: "github", providers: ["github"] },
          identities: [{ provider: "github" }]
        }
      },
      error: null
    });

    const response = await completeGoogleOAuth(
      new NextRequest(callbackUrl("valid")),
      harness.dependencies
    );

    expect(harness.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(harness.from).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      `${appOrigin}/sign-in?error=google_sign_in_failed`
    );
  });

  it("clears a candidate when the authoritative user differs from the exchange", async () => {
    const harness = createHarness();
    harness.exchangeCodeForSession.mockResolvedValue({
      data: {
        session: {
          access_token: "access-token",
          refresh_token: "refresh-token",
          user: { id: otherUserId }
        },
        user: { id: otherUserId }
      },
      error: null
    });
    harness.setSession.mockResolvedValue({
      data: {
        session: {
          access_token: "access-token",
          refresh_token: "refresh-token",
          user: { id: otherUserId }
        },
        user: { id: otherUserId }
      },
      error: null
    });

    const response = await completeGoogleOAuth(
      new NextRequest(callbackUrl("mismatched-user")),
      harness.dependencies
    );

    expect(harness.getUser).toHaveBeenCalledTimes(1);
    expect(harness.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(harness.from).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      `${appOrigin}/sign-in?error=google_sign_in_failed`
    );
  });

  it("correlates concurrent callbacks to their exact PKCE verifier slots", async () => {
    const first = createHarness();
    const second = createHarness();
    const firstFlowId = "1".repeat(32);
    const secondFlowId = "2".repeat(32);

    await completeGoogleOAuth(
      new NextRequest(callbackUrl("second-code", secondFlowId)),
      second.dependencies
    );
    await completeGoogleOAuth(
      new NextRequest(callbackUrl("first-code", firstFlowId)),
      first.dependencies
    );

    expect(second.exchangeCodeForSession).toHaveBeenCalledWith(
      "second-code",
      { flowId: secondFlowId }
    );
    expect(first.exchangeCodeForSession).toHaveBeenCalledWith(
      "first-code",
      { flowId: firstFlowId }
    );
  });

  it("clears an exchanged Google candidate without the exact owner workspace", async () => {
    const harness = createHarness();
    harness.limit.mockResolvedValue({ data: [], error: null });

    const response = await completeGoogleOAuth(
      new NextRequest(callbackUrl("valid")),
      harness.dependencies
    );

    expect(harness.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(response.headers.get("location")).toBe(
      `${appOrigin}/sign-in?error=google_sign_in_failed`
    );
  });
});

describe("local sign-out", () => {
  it("requires a same-origin POST contract and signs out only the current session", async () => {
    const harness = createHarness();
    const response = await signOutLocally(
      new NextRequest(`${appOrigin}/auth/sign-out`, {
        method: "POST",
        headers: {
          origin: appOrigin,
          "sec-fetch-site": "same-origin"
        }
      }),
      harness.dependencies
    );

    expect(harness.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`${appOrigin}/sign-in`);
  });

  it.each<{ headers: Record<string, string> }>([
    { headers: {} },
    { headers: { origin: "https://lookalike.test" } },
    { headers: { origin: appOrigin, "sec-fetch-site": "cross-site" } }
  ])("rejects a missing or cross-site sign-out origin", async ({ headers }) => {
    const harness = createHarness();
    const response = await signOutLocally(
      new NextRequest(`${appOrigin}/auth/sign-out`, { method: "POST", headers }),
      harness.dependencies
    );

    expect(harness.signOut).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      `${appOrigin}/sign-in?error=sign_out_failed`
    );
  });
});

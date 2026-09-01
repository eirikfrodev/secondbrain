import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type CoreDatabase,
  WorkspaceAccessRowSchema
} from "@utsikt/db";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import type { ResponseOwningSupabaseClient } from "../supabase/auth-response";
import { applyAuthNoStoreHeaders } from "../supabase/auth-response-cookie-bridge";

export const GoogleSignInFailureCode = "google_sign_in_failed";
export const SignOutFailureCode = "sign_out_failed";

const GoogleIdentityScopes = "openid email profile";
const GoogleAccountPrompt = "select_account";
const PkceFlowIdParameter = "sb_flow_id";
const LoopbackAuthHostnames = new Set(["localhost", "127.0.0.1", "[::1]"]);

const AllowedStartFetchSiteSchema = z.enum(["same-origin", "same-site", "none"]);
const AuthorizationCodeSchema = z.string().min(1).max(2048).regex(/^[A-Za-z0-9._~-]+$/);
const PkceFlowIdSchema = z.string().min(8).max(64).regex(/^[A-Za-z0-9_-]+$/);
const PkceChallengeSchema = z.string().min(43).max(128).regex(/^[A-Za-z0-9_-]+$/);
const SupabaseAuthorizationQuerySchema = z.strictObject({
  provider: z.literal("google"),
  redirect_to: z.url(),
  scopes: z.literal(GoogleIdentityScopes),
  prompt: z.literal(GoogleAccountPrompt),
  code_challenge: PkceChallengeSchema,
  code_challenge_method: z.literal("s256")
});
const OAuthStartResultSchema = z.looseObject({
  data: z.looseObject({
    provider: z.literal("google"),
    url: z.url(),
    flowId: PkceFlowIdSchema
  }),
  error: z.null()
});
const AuthResultSchema = z.looseObject({ error: z.unknown().nullable() });
const ExplicitAuthFailureResultSchema = z.looseObject({
  error: z.unknown().refine((error) => error !== null && error !== undefined)
});
const ExchangeResultSchema = z.looseObject({
  data: z.looseObject({
    session: z.looseObject({
      access_token: z.string().min(1),
      refresh_token: z.string().min(1),
      user: z.looseObject({ id: z.string().uuid() })
    }),
    user: z.looseObject({ id: z.string().uuid() })
  }).refine((data) => data.session.user.id === data.user.id),
  error: z.null()
});
const SanitizedSessionResultSchema = z.looseObject({
  data: z.looseObject({
    session: z.looseObject({
      access_token: z.string().min(1),
      refresh_token: z.string().min(1),
      user: z.looseObject({ id: z.string().uuid() })
    }).refine(
      (session) =>
        !("provider_token" in session) &&
        !("provider_refresh_token" in session)
    ),
    user: z.looseObject({ id: z.string().uuid() })
  }).refine((data) => data.session.user.id === data.user.id),
  error: z.null()
});
const GoogleUserResultSchema = z.looseObject({
  data: z.looseObject({
    user: z.looseObject({
      id: z.string().uuid(),
      email: z.email(),
      is_anonymous: z.literal(false),
      app_metadata: z.looseObject({
        provider: z.literal("google"),
        providers: z.array(z.string()).refine((providers) => providers.includes("google"))
      }),
      identities: z.array(
        z.looseObject({ provider: z.string() })
      ).refine((identities) => identities.some((identity) => identity.provider === "google"))
    })
  }),
  error: z.null()
});
const WorkspaceQueryResultSchema = z.looseObject({
  data: z.array(WorkspaceAccessRowSchema).nullable(),
  error: z.unknown().nullable()
});

export type OAuthTransportDependencies = {
  appOrigin: string;
  supabaseUrl: string;
  createClient(request: NextRequest): ResponseOwningSupabaseClient;
};

function appUrl(appOrigin: string, pathname: string): URL {
  return new URL(pathname, `${appOrigin}/`);
}

function genericGoogleFailure(appOrigin: string): NextResponse {
  const url = appUrl(appOrigin, "/sign-in");
  url.searchParams.set("error", GoogleSignInFailureCode);
  return NextResponse.redirect(url, { status: 303 });
}

function signOutRedirect(appOrigin: string, failed: boolean): NextResponse {
  const url = appUrl(appOrigin, "/sign-in");
  if (failed) {
    url.searchParams.set("error", SignOutFailureCode);
  }
  return NextResponse.redirect(url, { status: 303 });
}

function requestUrlHasOrigin(request: NextRequest, appOrigin: string): boolean {
  try {
    return new URL(request.url).origin === appOrigin;
  } catch {
    return false;
  }
}

function optionalOriginHeaderMatches(request: NextRequest, appOrigin: string): boolean {
  const origin = request.headers.get("origin");
  if (origin === null) {
    return true;
  }

  try {
    return new URL(origin).origin === appOrigin && new URL(origin).href === `${appOrigin}/`;
  } catch {
    return false;
  }
}

function startFetchSiteIsAllowed(request: NextRequest): boolean {
  const value = request.headers.get("sec-fetch-site");
  return value === null || AllowedStartFetchSiteSchema.safeParse(value).success;
}

function hasNoQuery(request: NextRequest): boolean {
  return new URL(request.url).search === "";
}

function parseCallbackInput(
  request: NextRequest,
  appOrigin: string
): { code: string; flowId: string } | null {
  if (request.method !== "GET" || !requestUrlHasOrigin(request, appOrigin)) {
    return null;
  }

  const url = new URL(request.url);
  if (url.pathname !== "/auth/callback" || url.hash !== "") {
    return null;
  }
  const keys = [...url.searchParams.keys()];
  if (
    keys.length !== 2 ||
    new Set(keys).size !== 2 ||
    !keys.includes("code") ||
    !keys.includes(PkceFlowIdParameter)
  ) {
    return null;
  }

  const values = url.searchParams.getAll("code");
  const flowIdValues = url.searchParams.getAll(PkceFlowIdParameter);
  if (values.length !== 1 || flowIdValues.length !== 1) {
    return null;
  }

  const code = AuthorizationCodeSchema.safeParse(values[0]);
  const flowId = PkceFlowIdSchema.safeParse(flowIdValues[0]);
  return code.success && flowId.success
    ? { code: code.data, flowId: flowId.data }
    : null;
}

function parseSupabaseAuthorizationUrl(
  value: string,
  supabaseUrl: string,
  appOrigin: string,
  flowId: string
): URL | null {
  try {
    const url = new URL(value);
    const configuredUrl = new URL(supabaseUrl);
    const expectedOrigin = configuredUrl.origin;
    const keys = [...url.searchParams.keys()];
    const query = SupabaseAuthorizationQuerySchema.safeParse(
      Object.fromEntries(url.searchParams.entries())
    );
    const hasExactKeys =
      keys.length === 6 && new Set(keys).size === 6;
    const hasAllowedConfiguredOrigin =
      configuredUrl.href === `${expectedOrigin}/` &&
      (
        configuredUrl.protocol === "https:" ||
        (
          configuredUrl.protocol === "http:" &&
          LoopbackAuthHostnames.has(configuredUrl.hostname)
        )
      );

    if (
      !hasAllowedConfiguredOrigin ||
      url.origin !== expectedOrigin ||
      url.pathname !== "/auth/v1/authorize" ||
      url.hash !== "" ||
      url.username !== "" ||
      url.password !== "" ||
      !hasExactKeys ||
      !query.success ||
      query.data.redirect_to !==
        `${appOrigin}/auth/callback?${PkceFlowIdParameter}=${encodeURIComponent(flowId)}`
    ) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

async function hasPersonalOwnerWorkspace(
  client: SupabaseClient<CoreDatabase>,
  userId: string
): Promise<boolean> {
  const result = await client
    .from("workspaces")
    .select("id,owner_user_id,kind")
    .eq("owner_user_id", userId)
    .eq("kind", "personal")
    .limit(2);
  const parsed = WorkspaceQueryResultSchema.safeParse(result);

  return parsed.success &&
    parsed.data.error === null &&
    parsed.data.data !== null &&
    parsed.data.data.length === 1 &&
    parsed.data.data[0]?.owner_user_id === userId &&
    parsed.data.data[0]?.kind === "personal";
}

async function discardCandidateSession(
  client: SupabaseClient<CoreDatabase>
): Promise<void> {
  try {
    await client.auth.signOut({ scope: "local" });
  } catch {
    // The fixed failure response is still returned. No provider details are exposed.
  }
}

export function createUnavailableAuthTransportResponse(): NextResponse {
  return applyAuthNoStoreHeaders(
    NextResponse.json({ error: "not_found" }, { status: 404 })
  );
}

export async function startGoogleOAuth(
  request: NextRequest,
  dependencies: OAuthTransportDependencies
): Promise<NextResponse> {
  const context = dependencies.createClient(request);
  const failed = () => context.applyTo(genericGoogleFailure(dependencies.appOrigin));

  if (
    request.method !== "GET" ||
    !requestUrlHasOrigin(request, dependencies.appOrigin) ||
    !optionalOriginHeaderMatches(request, dependencies.appOrigin) ||
    !startFetchSiteIsAllowed(request) ||
    !hasNoQuery(request)
  ) {
    return failed();
  }

  try {
    const result = await context.client.auth.signInWithOAuth({
      provider: "google",
      options: {
        queryParams: { prompt: GoogleAccountPrompt },
        redirectTo: `${dependencies.appOrigin}/auth/callback`,
        scopes: GoogleIdentityScopes,
        skipBrowserRedirect: true
      }
    });
    const parsed = OAuthStartResultSchema.safeParse(result);
    if (!parsed.success) {
      return failed();
    }

    const authorizationUrl = parseSupabaseAuthorizationUrl(
      parsed.data.data.url,
      dependencies.supabaseUrl,
      dependencies.appOrigin,
      parsed.data.data.flowId
    );
    return authorizationUrl === null
      ? failed()
      : context.applyTo(NextResponse.redirect(authorizationUrl));
  } catch {
    return failed();
  }
}

export async function completeGoogleOAuth(
  request: NextRequest,
  dependencies: OAuthTransportDependencies
): Promise<NextResponse> {
  const context = dependencies.createClient(request);
  const failed = () => context.applyTo(genericGoogleFailure(dependencies.appOrigin));
  const callbackInput = parseCallbackInput(request, dependencies.appOrigin);
  let candidateSessionEstablished = false;

  if (callbackInput === null) {
    return failed();
  }

  try {
    const rawExchangeResult = await context.client.auth.exchangeCodeForSession(
      callbackInput.code,
      { flowId: callbackInput.flowId }
    );
    if (ExplicitAuthFailureResultSchema.safeParse(rawExchangeResult).success) {
      return failed();
    }
    candidateSessionEstablished = true;
    const exchangeResult = ExchangeResultSchema.safeParse(rawExchangeResult);
    if (!exchangeResult.success) {
      await discardCandidateSession(context.client);
      return failed();
    }
    const exchangedUserId = exchangeResult.data.data.user.id;
    const sanitizedSession = SanitizedSessionResultSchema.safeParse(
      await context.client.auth.setSession({
        access_token: exchangeResult.data.data.session.access_token,
        refresh_token: exchangeResult.data.data.session.refresh_token
      })
    );
    if (
      !sanitizedSession.success ||
      sanitizedSession.data.data.user.id !== exchangedUserId
    ) {
      await discardCandidateSession(context.client);
      return failed();
    }

    const userResult = GoogleUserResultSchema.safeParse(
      await context.client.auth.getUser()
    );
    if (
      !userResult.success ||
      userResult.data.data.user.id !== exchangedUserId
    ) {
      await discardCandidateSession(context.client);
      return failed();
    }

    if (!await hasPersonalOwnerWorkspace(context.client, userResult.data.data.user.id)) {
      await discardCandidateSession(context.client);
      return failed();
    }

    return context.applyTo(
      NextResponse.redirect(appUrl(dependencies.appOrigin, "/today"), { status: 303 })
    );
  } catch {
    if (candidateSessionEstablished) {
      await discardCandidateSession(context.client);
    }
    return failed();
  }
}

export async function signOutLocally(
  request: NextRequest,
  dependencies: OAuthTransportDependencies
): Promise<NextResponse> {
  const context = dependencies.createClient(request);
  const validRequest =
    request.method === "POST" &&
    requestUrlHasOrigin(request, dependencies.appOrigin) &&
    optionalOriginHeaderMatches(request, dependencies.appOrigin) &&
    request.headers.get("origin") !== null &&
    startFetchSiteIsAllowed(request) &&
    hasNoQuery(request);

  if (!validRequest) {
    return context.applyTo(signOutRedirect(dependencies.appOrigin, true));
  }

  try {
    const result = AuthResultSchema.safeParse(
      await context.client.auth.signOut({ scope: "local" })
    );
    return context.applyTo(
      signOutRedirect(
        dependencies.appOrigin,
        !result.success || result.data.error !== null
      )
    );
  } catch {
    return context.applyTo(signOutRedirect(dependencies.appOrigin, true));
  }
}

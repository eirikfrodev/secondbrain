import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CoreDatabase } from "@utsikt/db";
import type { NextRequest, NextResponse } from "next/server";

import { RuntimeConfigurationError } from "../runtime-config";
import {
  getServerAppOrigin,
  getServerRuntimeConfig
} from "../runtime-config.server";
import { createAuthResponseCookieBridge } from "./auth-response-cookie-bridge";
import { createSupabaseCookieOptions } from "./cookie-policy";

export type ResponseOwningSupabaseClient = {
  client: SupabaseClient<CoreDatabase>;
  applyTo(response: NextResponse): NextResponse;
};

export function createResponseOwningServerSupabaseClient(
  request: NextRequest
): ResponseOwningSupabaseClient {
  const config = getServerRuntimeConfig();

  if (config.mode === "mock") {
    throw new RuntimeConfigurationError(
      "An authentication client cannot be created while connector mode is mock."
    );
  }

  const bridge = createAuthResponseCookieBridge(request);
  const client = createServerClient<CoreDatabase>(
    config.supabaseUrl,
    config.publishableKey,
    {
      auth: {
        experimental: { appendPkceFlowIdToRedirects: true }
      },
      cookieOptions: createSupabaseCookieOptions(getServerAppOrigin()),
      cookies: bridge.cookies
    }
  );

  return {
    client,
    applyTo(response) {
      return bridge.applyTo(response);
    }
  };
}

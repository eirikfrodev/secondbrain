import { createServerClient } from "@supabase/ssr";
import type { CoreDatabase } from "@utsikt/db";
import { type NextRequest, NextResponse } from "next/server";

import { getServerRuntimeConfig } from "../runtime-config.server";
import { createProxyCookieBridge } from "./proxy-cookie-bridge";

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const config = getServerRuntimeConfig();

  if (config.mode === "mock") {
    return NextResponse.next({ request });
  }

  const bridge = createProxyCookieBridge(request);
  const client = createServerClient<CoreDatabase>(
    config.supabaseUrl,
    config.publishableKey,
    { cookies: bridge.cookies }
  );

  await client.auth.getClaims();
  return bridge.response;
}

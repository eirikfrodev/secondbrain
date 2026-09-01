import type { NextRequest } from "next/server";

import {
  completeGoogleOAuth,
  createUnavailableAuthTransportResponse
} from "@/lib/auth/oauth-transport";
import {
  getServerAppOrigin,
  getServerRuntimeConfig
} from "@/lib/runtime-config.server";
import { createResponseOwningServerSupabaseClient } from "@/lib/supabase/auth-response";

export async function GET(request: NextRequest) {
  const config = getServerRuntimeConfig();

  if (config.mode === "mock") {
    return createUnavailableAuthTransportResponse();
  }

  return completeGoogleOAuth(request, {
    appOrigin: getServerAppOrigin(),
    supabaseUrl: config.supabaseUrl,
    createClient: createResponseOwningServerSupabaseClient
  });
}

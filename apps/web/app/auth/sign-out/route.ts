import type { NextRequest } from "next/server";

import {
  createUnavailableAuthTransportResponse,
  signOutLocally
} from "@/lib/auth/oauth-transport";
import {
  getServerAppOrigin,
  getServerRuntimeConfig
} from "@/lib/runtime-config.server";
import { createResponseOwningServerSupabaseClient } from "@/lib/supabase/auth-response";

export async function POST(request: NextRequest) {
  const config = getServerRuntimeConfig();

  if (config.mode === "mock") {
    return createUnavailableAuthTransportResponse();
  }

  return signOutLocally(request, {
    appOrigin: getServerAppOrigin(),
    supabaseUrl: config.supabaseUrl,
    createClient: createResponseOwningServerSupabaseClient
  });
}

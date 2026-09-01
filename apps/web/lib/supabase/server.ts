import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CoreDatabase } from "@utsikt/db";
import { cookies } from "next/headers";

import { RuntimeConfigurationError } from "../runtime-config";
import {
  getServerAppOrigin,
  getServerRuntimeConfig
} from "../runtime-config.server";
import { createSupabaseCookieOptions } from "./cookie-policy";

export async function createReadOnlyServerSupabaseClient(): Promise<SupabaseClient<CoreDatabase>> {
  const config = getServerRuntimeConfig();

  if (config.mode === "mock") {
    throw new RuntimeConfigurationError(
      "A Supabase client cannot be created while connector mode is mock."
    );
  }

  const cookieStore = await cookies();

  return createServerClient<CoreDatabase>(config.supabaseUrl, config.publishableKey, {
    cookieOptions: createSupabaseCookieOptions(getServerAppOrigin()),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      }
    }
  });
}

"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CoreDatabase } from "@utsikt/db";

import { getBrowserRuntimeConfig } from "../runtime-config.browser";
import {
  createSupabaseCookieOptions,
  getBrowserApplicationOrigin
} from "./cookie-policy";

export type BrowserDataClient =
  | { mode: "mock" }
  | { mode: "supabase"; client: SupabaseClient<CoreDatabase> };

export function createBrowserDataClient(): BrowserDataClient {
  const config = getBrowserRuntimeConfig();

  if (config.mode === "mock") {
    return { mode: "mock" };
  }

  return {
    mode: "supabase",
    client: createBrowserClient<CoreDatabase>(
      config.supabaseUrl,
      config.publishableKey,
      {
        cookieOptions: createSupabaseCookieOptions(
          getBrowserApplicationOrigin(config.supabaseUrl)
        )
      }
    )
  };
}

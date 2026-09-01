import "server-only";

import { resolveAppOrigin, resolveServerRuntimeConfig } from "./runtime-config";

export function getServerRuntimeConfig() {
  return resolveServerRuntimeConfig({
    serverConnectorMode: process.env.CONNECTOR_MODE,
    connectorMode: process.env.NEXT_PUBLIC_CONNECTOR_MODE,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  });
}

export function getServerAppOrigin(): string {
  return resolveAppOrigin(process.env.APP_ORIGIN);
}

export function getServerMutationAppOrigin(requestUrl: string): string {
  const config = getServerRuntimeConfig();

  return config.mode === "supabase"
    ? getServerAppOrigin()
    : resolveAppOrigin(new URL(requestUrl).origin);
}

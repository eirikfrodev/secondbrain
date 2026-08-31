import "server-only";

import { resolveServerRuntimeConfig } from "./runtime-config";

export function getServerRuntimeConfig() {
  return resolveServerRuntimeConfig({
    serverConnectorMode: process.env.CONNECTOR_MODE,
    connectorMode: process.env.NEXT_PUBLIC_CONNECTOR_MODE,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  });
}

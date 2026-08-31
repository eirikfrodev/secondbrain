import { resolvePublicRuntimeConfig } from "./runtime-config";

export function getBrowserRuntimeConfig() {
  return resolvePublicRuntimeConfig({
    connectorMode: process.env.NEXT_PUBLIC_CONNECTOR_MODE,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  });
}

import type { NextConfig } from "next";

import { resolveServerRuntimeConfig } from "./lib/runtime-config";

resolveServerRuntimeConfig({
  serverConnectorMode: process.env.CONNECTOR_MODE,
  connectorMode: process.env.NEXT_PUBLIC_CONNECTOR_MODE,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
});

const nextConfig: NextConfig = {
  devIndicators: false,
  reactStrictMode: true,
  transpilePackages: ["@utsikt/db", "@utsikt/domain", "@utsikt/testing", "@utsikt/ui"]
};

export default nextConfig;

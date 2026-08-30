import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  reactStrictMode: true,
  transpilePackages: ["@utsikt/domain", "@utsikt/testing", "@utsikt/ui"]
};

export default nextConfig;

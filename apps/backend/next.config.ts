import type { NextConfig } from "next";

const nextConfig = {
  reactStrictMode: false,
  output: "standalone",
  serverExternalPackages: ["@prisma/client"],
  // Raise the middleware body buffer so large video uploads aren't truncated.
  // The type definitions for Next.js 16 don't include this key yet, but it is
  // documented at: /docs/app/api-reference/config/next-config-js/middlewareClientMaxBodySize
  middlewareClientMaxBodySize: 524288000, // 500 MB in bytes
  experimental: {
    serverActions: {
      bodySizeLimit: "500mb",
    },
  },
} satisfies Record<string, unknown> as NextConfig;

export default nextConfig;

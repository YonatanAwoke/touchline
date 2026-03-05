import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  experimental: {
    // Increase body size limit for video uploads (500MB)
    serverActions: {
      bodySizeLimit: "500mb",
    },
  },
};

export default nextConfig;

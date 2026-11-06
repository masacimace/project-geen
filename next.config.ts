import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "3mb" },
  },
  // VPS deployment and reverse-proxy hardening come later.
};

export default nextConfig;

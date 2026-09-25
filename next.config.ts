import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Sheet imports are sent as JSON in the action body; default 1MB is tight for a large catalog.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;

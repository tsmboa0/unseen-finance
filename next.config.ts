import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@unseen_fi/ui"],
  allowedDevOrigins: ["172.20.10.4"],
  experimental: {
    externalDir: true,
  },
};

export default nextConfig;

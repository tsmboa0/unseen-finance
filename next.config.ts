import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@unseen_fi/ui"],
  allowedDevOrigins: ["172.20.10.4"],
  experimental: {
    externalDir: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;

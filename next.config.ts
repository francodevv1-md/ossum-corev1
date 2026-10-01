import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  serverExternalPackages: ['@prisma/client', 'prisma'],
  allowedDevOrigins: ['100.107.173.14', '100.107.68.126'],
};

export default nextConfig;

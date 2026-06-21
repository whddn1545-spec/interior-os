import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@interior-os/core", "@interior-os/db"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;

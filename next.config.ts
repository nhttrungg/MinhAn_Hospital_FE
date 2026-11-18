import type { NextConfig } from "next";

const apiTarget = process.env.API_PROXY_TARGET ?? "http://127.0.0.1:8080";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  output: "standalone",
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${apiTarget}/api/:path*` },
      { source: "/actuator/:path*", destination: `${apiTarget}/actuator/:path*` },
    ];
  },
};

export default nextConfig;

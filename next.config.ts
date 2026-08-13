import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse', 'sharp'],
  async headers() {
    return [
      {
        // matching all API routes
        source: "/api/:path*",
        headers: [
          // No Allow-Credentials here: browsers reject it combined with Origin "*",
          // and it is not needed — the API authenticates with a Bearer token, not
          // cookies. The wildcard origin stays so the Expo mobile client (Metro on
          // :8081) and its web build can call these routes.
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" },
        ]
      }
    ]
  }
};

export default nextConfig;

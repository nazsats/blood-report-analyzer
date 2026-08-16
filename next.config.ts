import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse', 'sharp'],
  // pdf-parse reaches @napi-rs/canvas through a bare require the file tracer cannot see,
  // so the native dependency was silently left out of the deployment and the route threw
  // MODULE_NOT_FOUND while it was still being imported. Name it explicitly.
  outputFileTracingIncludes: {
    // pdf-parse carries no nested copy, so both it and the pdfjs-dist it bundles resolve
    // to the hoisted one — that single copy is all this route needs. The glob keeps the
    // per-platform binary package too (canvas-linux-x64-gnu on the deploy target).
    '/api/analyze': ['./node_modules/@napi-rs/canvas*/**/*'],
  },
  // Note: naming the hoisted copy also makes the tracer pull in the nested @napi-rs copies
  // under pdfjs-dist and pdf-to-img, which nothing server-side loads. That lands the
  // function around 123MB against a 250MB limit, so it is left alone —
  // outputFileTracingExcludes does not currently remove them under Turbopack.
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

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["mapbox-gl", "@weathertrip/i18n", "@weathertrip/logger"],
  // Pino uses worker threads / thread-stream — keep them external to the bundle.
  serverExternalPackages: ["pino", "pino-pretty", "thread-stream"],
  // Playwright / local tooling hits the app via 127.0.0.1 while `next dev`
  // may bind on 0.0.0.0 — allow HMR/dev assets from that origin.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
      {
        protocol: "https",
        hostname: "commons.wikimedia.org",
      },
      {
        protocol: "https",
        hostname: "*.wikipedia.org",
      },
      {
        protocol: "https",
        hostname: "api.mapbox.com",
        pathname: "/styles/v1/**",
      },
    ],
  },
};

export default nextConfig;

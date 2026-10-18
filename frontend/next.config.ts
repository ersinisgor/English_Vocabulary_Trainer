import type { NextConfig } from "next";

// In production the browser talks to the same origin (/api/v1) and Next.js
// proxies the request to the backend. That keeps the httpOnly refresh cookie
// first-party, so SameSite=Lax works without cross-site cookie tweaks.
const backendUrl = process.env.BACKEND_URL?.replace(/\/$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    if (!backendUrl) return [];
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

// Where the Spring Boot backend runs. Set BACKEND_URL on the host (e.g. Vercel); locally it is IntelliJ on 8080.
const backendUrl = (process.env.BACKEND_URL || "http://localhost:8080").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

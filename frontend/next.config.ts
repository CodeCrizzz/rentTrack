import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/tenant/dashboard", destination: "/tenant?tab=overview", permanent: false },
      { source: "/tenant/rooms", destination: "/tenant?tab=room", permanent: false },
      { source: "/tenant/payments", destination: "/tenant?tab=payments", permanent: false },
      { source: "/tenant/portal", destination: "/tenant", permanent: false },
    ];
  },
  allowedDevOrigins: ["[IP_ADDRESS]", "localhost:3000"],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default withSerwist(nextConfig);

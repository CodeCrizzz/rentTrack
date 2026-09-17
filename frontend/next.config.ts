import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  allowedDevOrigins: ["[IP_ADDRESS]", "localhost:3000"],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default withSerwist(nextConfig);

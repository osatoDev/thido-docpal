import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    THIDO_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA ?? "",
    THIDO_DEPLOYMENT_ENV:
      process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
  },
};

export default nextConfig;

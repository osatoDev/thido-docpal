import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev only: the e2e run drives the app on the 127.0.0.1 loopback, which Next
  // treats as a different origin from "localhost" and would otherwise block its
  // dev/HMR resources from, breaking client hydration (the editor never mounts).
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // PDFKit reads its built-in AFM font metrics from files beside the package.
  // Keep it external so server bundling does not rewrite those paths.
  serverExternalPackages: ["officeparser", "pdfkit", "word-extractor"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  env: {
    THIDO_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA ?? "",
    THIDO_DEPLOYMENT_ENV:
      process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
  },
};

export default nextConfig;

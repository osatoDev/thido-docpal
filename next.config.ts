import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev only: the e2e run drives the app on the 127.0.0.1 loopback, which Next
  // treats as a different origin from "localhost" and would otherwise block its
  // dev/HMR resources from, breaking client hydration (the editor never mounts).
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // PDFKit reads its built-in AFM font metrics from files beside the package.
  // Keep it external so server bundling does not rewrite those paths.
  // `happy-dom`/`@tiptap/html` (used by markdownToTiptapJSON for server-side
  // Markdown import) need the same treatment for a different reason: bundled,
  // the build's own file-trace manifest for the import route included 0 of
  // @tiptap/html's files and only 18 of happy-dom's ~2,372, so the deployed
  // Vercel function was missing the vast majority of both at runtime — a
  // crash inside Node's own module resolution, before any application error
  // handling runs, which is why it worked in dev (full node_modules on disk)
  // but 500'd in production with nothing reaching Rollbar.
  serverExternalPackages: [
    "officeparser",
    "pdfkit",
    "word-extractor",
    "happy-dom",
    "@tiptap/html",
  ],
  // sharp (used by the import route's Word-image conversion and by
  // `documentFileImages.ts`) is already externalized by Next's own default
  // list, but its actual platform binary lives in a *separate* optional
  // dependency (`@img/sharp-linux-x64`) whose native addon then dlopens a
  // *third* package's shared library (`@img/sharp-libvips-linux-x64`) at
  // runtime, outside any `require()` static analysis can see. The file
  // tracer can't follow that, so it traced sharp for the platform that
  // happened to be installed on whichever machine ran the build (this
  // repo's build has been run locally on macOS as well as on Vercel's own
  // Linux build machines), and dropped the libvips `.so` file, producing
  // `ERR_DLOPEN_FAILED: libvips-cpp.so.*: cannot open shared object file`
  // in production. This is a known-enough failure mode that Next's own
  // docs list `node_modules/sharp/**/*` as the example fix; `@img/**/*`
  // covers the sibling packages sharp actually loads at runtime.
  outputFileTracingIncludes: {
    "/*": ["node_modules/sharp/**/*", "node_modules/@img/**/*"],
  },
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

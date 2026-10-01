import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // react-pdf ships its own native-ish font/layout deps; keep it out of the bundle.
  serverExternalPackages: ["@react-pdf/renderer"],
  // The print exporter embeds these fonts (KDP requires embedded fonts) and
  // reads them from disk, which file tracing can't detect on its own.
  outputFileTracingIncludes: {
    "/api/documents/*/export/manuscript": [
      "./node_modules/@fontsource/{eb-garamond,libre-baskerville,crimson-text}/files/*-latin-{400,700}-{normal,italic}.woff",
    ],
  },
};

export default nextConfig;

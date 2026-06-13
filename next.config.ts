import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle (.next/standalone) so the production
  // Docker image can run `node server.js` without node_modules.
  output: 'standalone',
};

export default nextConfig;

import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Parent folder has a package-lock.json that otherwise becomes the inferred root
  // and breaks Turbopack page module resolution during `next build`.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;

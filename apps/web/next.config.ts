import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@spend-tracker/shared"],
  // Avoid turbopack.root=monorepo on Vercel — it hangs scanning the workspace.
  // CSS via PostCSS (@tailwindcss/postcss) so webpack builds work in CI.
};

export default nextConfig;

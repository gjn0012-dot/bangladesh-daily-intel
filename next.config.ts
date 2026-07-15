import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_ACTIONS === "true";
const basePath = isGitHubPages ? "/bangladesh-daily-intel" : "";

const nextConfig: NextConfig = {
  output: isGitHubPages ? "export" : undefined,
  basePath,
  assetPrefix: basePath,
  trailingSlash: true,
};

export default nextConfig;

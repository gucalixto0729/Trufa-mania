import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    turbopack: {
      resolveAlias: {
        "@/*": "./src/*",
      },
    },
  },
  typescript: {
    ignoreBuildErrors: false,
  },
}

export default nextConfig

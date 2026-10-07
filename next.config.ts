import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Keep page titles, descriptions and canonicals in <head> for every crawler.
  // All generated metadata comes from the bundled, validated snapshot.
  htmlLimitedBots: /./,
};

export default nextConfig;

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The framework banner adds nothing and advertises the stack.
  poweredByHeader: false,
};

export default nextConfig;

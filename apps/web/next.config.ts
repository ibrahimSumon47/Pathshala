import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The framework banner adds nothing and advertises the stack.
  poweredByHeader: false,
  experimental: {
    // Course images are capped at 1.5 MB, so one upload needs a little more than 1 MB.
    serverActions: { bodySizeLimit: '3mb' },
  },
};

export default withNextIntl(nextConfig);

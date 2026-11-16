import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The framework banner adds nothing and advertises the stack.
  poweredByHeader: false,
};

export default withNextIntl(nextConfig);

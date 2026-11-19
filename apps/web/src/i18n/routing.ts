import { defineRouting } from 'next-intl/routing';

/**
 * Bangla is the default and lives at `/`; English is served from `/en`.
 * `as-needed` keeps the Bangla URLs clean while every page still has a
 * language-specific address for search engines and sharing.
 */
export const routing = defineRouting({
  locales: ['bn', 'en'],
  defaultLocale: 'bn',
  localePrefix: 'as-needed',
});


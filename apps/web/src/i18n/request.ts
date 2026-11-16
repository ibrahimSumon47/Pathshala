import * as rootParams from 'next/root-params';
import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from './routing';

/**
 * next-intl reads the locale from the root `[locale]` segment and loads the matching
 * message file. Using `next/root-params` keeps pages statically renderable on Next 16.
 */
export default getRequestConfig(async ({ locale }) => {
  if (!locale) {
    const paramValue = await rootParams.locale();
    if (!hasLocale(routing.locales, paramValue)) {
      notFound();
    }
    locale = paramValue;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    // Everything on the site is scheduled and dated in Dhaka time.
    timeZone: 'Asia/Dhaka',
  };
});

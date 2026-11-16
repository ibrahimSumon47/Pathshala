import '@pathshala/tokens/theme.css';
import '../globals.css';
import type { Metadata } from 'next';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { Inter, Noto_Sans_Bengali } from 'next/font/google';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/site-header';
import { routing } from '@/i18n/routing';
import { cn } from '@/lib/cn';
import { normalizeTheme, THEME_COOKIE } from '@/lib/theme';
import styles from './layout.module.css';

// Inter covers Latin and punctuation; the Bengali face takes over for Bangla glyphs.
const latin = Inter({ subsets: ['latin'], variable: '--font-latin', display: 'swap' });
const bengali = Noto_Sans_Bengali({
  subsets: ['bengali'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-bengali',
  display: 'swap',
});

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

/** Pre-render both languages at build time. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Pick<LayoutProps, 'params'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return { title: t('title'), description: t('description') };
}

/** Root layout: language, fonts, theme, header, footer. */
export default async function LocaleLayout({ children, params }: LayoutProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: 'Footer' });
  const common = await getTranslations({ locale, namespace: 'Common' });
  const theme = normalizeTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <html lang={locale} data-theme={theme} suppressHydrationWarning>
      <body className={cn(latin.variable, bengali.variable)}>
        <NextIntlClientProvider>
          <a className={styles.skip} href="#main">
            {common('skipToContent')}
          </a>
          <SiteHeader theme={theme} />
          <main id="main">{children}</main>
          <footer className={styles.footer}>
            <div className={cn('container', styles.footerInner)}>
              <p className={styles.footerBrand}>
                পাঠশালা <span className={styles.footerTagline}>— {t('tagline')}</span>
              </p>
              <p>{t('copyright')}</p>
            </div>
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

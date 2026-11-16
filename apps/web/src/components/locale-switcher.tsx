'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';
import styles from './locale-switcher.module.css';

// Each language is named in itself, which is how people recognise their own language.
const names: Record<string, string> = { bn: 'বাংলা', en: 'English' };

/** Switches language without losing the page the reader is on. */
export function LocaleSwitcher() {
  const active = useLocale();
  const pathname = usePathname();
  const t = useTranslations('Header');

  return (
    <div className={styles.switch} role="group" aria-label={t('switchTo')}>
      {routing.locales.map((locale) => (
        <Link
          key={locale}
          href={pathname}
          locale={locale}
          className={cn(styles.option, locale === active && styles.active)}
          aria-current={locale === active ? 'true' : undefined}
        >
          {names[locale]}
        </Link>
      ))}
    </div>
  );
}

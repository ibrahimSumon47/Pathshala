import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { LocaleSwitcher } from './locale-switcher';
import { ThemeToggle } from './theme-toggle';
import styles from './site-header.module.css';

/** Masthead: wordmark, the one catalogue link, and the two reader preferences. */
export function SiteHeader() {
  const t = useTranslations('Header');

  return (
    <header className={styles.header}>
      <div className={cn('container', styles.inner)}>
        <Link href="/" className={styles.brand} aria-label={t('homeLabel')}>
          <span className={styles.brandBangla} lang="bn">
            {t('brand')}
          </span>
          <span className={styles.brandLatin}>{t('brandLatin')}</span>
        </Link>

        <nav className={styles.nav} aria-label={t('navLabel')}>
          <Link href="/courses" className={styles.navLink}>
            {t('navCourses')}
          </Link>
        </nav>

        <div className={styles.controls}>
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

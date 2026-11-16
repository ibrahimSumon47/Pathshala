import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import type { Theme } from '@/lib/theme';
import { LocaleSwitcher } from './locale-switcher';
import { ThemeToggle } from './theme-toggle';
import styles from './site-header.module.css';

type SiteHeaderProps = {
  theme: Theme;
};

/** Masthead: wordmark, catalogue link, account state and the two reader preferences. */
export async function SiteHeader({ theme }: SiteHeaderProps) {
  const t = await getTranslations('Header');
  const session = await auth();
  const signedIn = Boolean(session?.user);
  const canTeach = Boolean(session?.user?.roles.some((role) => role === 'instructor' || role === 'admin'));

  return (
    <header className={styles.header}>
      <div className={cn('container', styles.inner)}>
        <Link href="/" className={styles.brand}>
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
          {canTeach ? (
            <Link href="/studio" className={styles.account}>
              {t('studio')}
            </Link>
          ) : null}
          <Link href={signedIn ? '/dashboard' : '/sign-in'} className={styles.account}>
            {signedIn ? t('dashboard') : t('signIn')}
          </Link>
          <LocaleSwitcher />
          <ThemeToggle initialTheme={theme} />
        </div>
      </div>
    </header>
  );
}

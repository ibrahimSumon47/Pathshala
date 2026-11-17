import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { Link } from '@/i18n/navigation';
import { signOutAction } from '@/lib/auth/actions';
import { initialsFor } from '@/lib/profile';
import { buttonStyles } from '@/components/ui/button';
import { CommandPalette } from './command-palette';
import type { Theme } from '@/lib/theme';
import { cn } from '@/lib/cn';
import { LocaleSwitcher } from './locale-switcher';
import { SiteNav, type SiteNavItem } from './site-nav';
import { ThemeToggle } from './theme-toggle';
import styles from './site-header.module.css';

type SiteHeaderProps = {
  theme: Theme;
};

/** Chevron for the account menu; the rotation is the only motion it needs. */
function Chevron() {
  return (
    <svg className={styles.chevron} aria-hidden="true" focusable="false" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/** Masthead: identity, the two or three places a reader goes, and their account menu. */
export async function SiteHeader({ theme }: SiteHeaderProps) {
  const t = await getTranslations('Header');
  const session = await auth();
  const signedIn = Boolean(session?.user);
  const name = session?.user?.name ?? '';
  const roles = session?.user?.roles ?? [];
  const canTeach = roles.includes('instructor') || roles.includes('admin');
  const isAdmin = roles.includes('admin');

  // Keep the bar honest: a visitor sees the catalogue, a learner sees their own shelf.
  const items: SiteNavItem[] = [{ href: '/courses', label: t('navCourses') }];
  if (signedIn) items.push({ href: '/dashboard', label: t('navLearning') });
  if (canTeach) items.push({ href: '/studio', label: t('studio') });
  if (isAdmin) items.push({ href: '/admin', label: t('admin') });

  // The palette searches courses and jumps to the pages this reader can actually open.
  const paletteItems = [
    { href: '/courses', label: t('navCourses'), show: true },
    { href: '/dashboard', label: t('navLearning'), show: signedIn },
    { href: '/dashboard/profile', label: t('profile'), show: signedIn },
    { href: '/dashboard/settings', label: t('settings'), show: signedIn },
    { href: '/studio', label: t('studio'), show: canTeach },
    { href: '/admin', label: t('admin'), show: isAdmin },
  ]
    .filter((item) => item.show)
    .map(({ href, label }) => ({ href, label }));

  return (
    <header className={styles.header}>
      <div className={cn('container', styles.inner)}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true" lang="bn">
            প
          </span>
          <span className={styles.brandWords}>
            <span className={styles.brandBangla} lang="bn">
              {t('brand')}
            </span>
            <span className={styles.brandLatin}>{t('brandLatin')}</span>
          </span>
        </Link>

        <SiteNav items={items} label={t('navLabel')} />

        <div className={styles.controls}>
          <CommandPalette items={paletteItems} />
          <LocaleSwitcher />
          <ThemeToggle initialTheme={theme} />

          {signedIn ? (
            <details className={styles.account}>
              <summary className={styles.accountButton}>
                <span className={styles.srOnly}>{t('account')}</span>
                <span className={styles.avatar} aria-hidden="true">
                  {initialsFor(name)}
                </span>
                <span className={styles.accountName}>{name.split(' ')[0]}</span>
                <Chevron />
              </summary>
              <div className={styles.menu}>
                <div className={styles.menuHead}>
                  <span className={styles.menuName}>{name}</span>
                  <span className={styles.menuEmail}>{session?.user?.email}</span>
                </div>
                <nav className={styles.menuNav} aria-label={t('account')}>
                  <Link href="/dashboard/profile">{t('profile')}</Link>
                  <Link href="/dashboard">{t('dashboard')}</Link>
                  {canTeach ? <Link href="/studio">{t('studio')}</Link> : null}
                  {isAdmin ? <Link href="/admin">{t('admin')}</Link> : null}
                  <Link href="/dashboard/settings">{t('settings')}</Link>
                </nav>
                <form action={signOutAction} className={styles.menuForm}>
                  <button type="submit" className={styles.logout}>
                    {t('logOut')}
                  </button>
                </form>
              </div>
            </details>
          ) : (
            <div className={styles.guest}>
              <Link href="/sign-in" className={styles.signIn}>
                {t('signIn')}
              </Link>
              <Link href="/register" className={buttonStyles({ size: 'sm' })}>
                {t('startLearning')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

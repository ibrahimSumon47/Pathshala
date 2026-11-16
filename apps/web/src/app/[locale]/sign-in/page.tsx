import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import type { UserRole } from '@pathshala/db';
import { auth, googleEnabled } from '@/auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { DEMO_ACCOUNTS, demoAuthEnabled } from '@/lib/auth/demo-accounts';
import { signInWithCredentials, signInWithGoogle } from '@/lib/auth/actions';
import { cn } from '@/lib/cn';
import styles from './sign-in.module.css';

type SignInPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
};

/** Credentials form, optional Google button and the public demo accounts. */
export default async function SignInPage({ params, searchParams }: SignInPageProps) {
  const { locale } = await params;
  const { error } = await searchParams;
  const isEnglish = locale === 'en';

  const session = await auth();
  if (session?.user) {
    redirect(isEnglish ? '/en/dashboard' : '/dashboard');
  }

  const t = await getTranslations('Auth');
  const roles = await getTranslations('Roles');
  const roleLabel = (role: UserRole) => roles(role);
  const showDemo = demoAuthEnabled();

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.intro}>
          <p className={styles.eyebrow}>{t('eyebrow')}</p>
          <h1 className={styles.title}>{t('title')}</h1>
          <p className={styles.lede}>{t('lede')}</p>
        </div>

        <div className={cn(styles.grid, !showDemo && styles.gridSingle)}>
          <Card className={styles.panel}>
            <form action={signInWithCredentials} className={styles.form}>
              <input type="hidden" name="locale" value={locale} />
              <Field id="email" name="email" type="email" label={t('email')} autoComplete="email" required />
              <Field
                id="password"
                name="password"
                type="password"
                label={t('password')}
                autoComplete="current-password"
                minLength={8}
                required
              />
              {error ? (
                <p className={styles.error} role="alert">
                  {t('invalid')}
                </p>
              ) : null}
              <Button type="submit">{t('submit')}</Button>
            </form>

            {googleEnabled ? (
              <>
                <p className={styles.or}>{t('or')}</p>
                <form action={signInWithGoogle}>
                  <input type="hidden" name="locale" value={locale} />
                  <Button type="submit" variant="secondary" className={styles.google}>
                    {t('google')}
                  </Button>
                </form>
              </>
            ) : null}
          </Card>

          {showDemo ? (
            <Card className={styles.demo}>
              <h2 className={styles.demoTitle}>{t('demoTitle')}</h2>
              <p className={styles.demoNote}>{t('demoNote')}</p>
              <ul className={styles.demoList}>
                {DEMO_ACCOUNTS.map((account) => (
                  <li key={account.email} className={styles.demoItem}>
                    <span className={styles.demoRole}>{roleLabel(account.role)}</span>
                    <p className={styles.demoCredentials}>
                      {account.email} · {account.password}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

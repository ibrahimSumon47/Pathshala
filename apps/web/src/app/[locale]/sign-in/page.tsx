import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { User, connectToDatabase } from '@pathshala/db';
import type { UserRole } from '@pathshala/db';
import { auth, googleEnabled } from '@/auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { DEMO_ACCOUNTS, demoAuthEnabled } from '@/lib/auth/demo-accounts';
import { signInWithCredentials, signInWithGoogle, signUpAction } from '@/lib/auth/actions';
import { cn } from '@/lib/cn';
import styles from './sign-in.module.css';

/** A deleted account keeps a valid cookie until sign-out, so check the record. */
async function accountExists(userId: string): Promise<boolean> {
  if (!process.env.MONGODB_URI) return true;
  if (!/^[a-f0-9]{24}$/i.test(userId)) return true;
  await connectToDatabase();
  return Boolean(await User.exists({ _id: userId }));
}

type SignInPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; registered?: string; signupError?: string }>;
};

/** Credentials form, optional Google button and the public demo accounts. */
export default async function SignInPage({ params, searchParams }: SignInPageProps) {
  const { locale } = await params;
  const { error, registered, signupError } = await searchParams;
  const isEnglish = locale === 'en';

  const session = await auth();
  // A token can outlive its account; only a live record is sent onward to the dashboard.
  if (session?.user && (await accountExists(session.user.id))) {
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
              {registered ? <p className={styles.success} role="status">{isEnglish ? 'Account created. Sign in to continue.' : 'অ্যাকাউন্ট তৈরি হয়েছে। এগিয়ে যেতে সাইন ইন করুন।'}</p> : null}
              <Button type="submit">{t('submit')}</Button>
            </form>

            <section id="create-account" className={styles.signup} aria-labelledby="signup-heading">
              <h2 id="signup-heading" className={styles.demoTitle}>{isEnglish ? 'Create a learner account' : 'শিক্ষার্থী অ্যাকাউন্ট খুলুন'}</h2>
              {signupError ? (
                <p className={styles.error} role="alert">
                  {signupError === 'exists'
                    ? (isEnglish ? 'An account already uses that email. Sign in instead.' : 'এই ইমেইলে অ্যাকাউন্ট আছে। সাইন ইন করুন।')
                    : (isEnglish ? 'Check your name, email and password (at least 12 characters).' : 'নাম, ইমেইল ও পাসওয়ার্ড দেখুন (কমপক্ষে ১২ অক্ষর)।')}
                </p>
              ) : null}
              <form action={signUpAction} className={styles.form}>
                <input type="hidden" name="locale" value={locale} />
                <Field id="signup-name" name="name" label={isEnglish ? 'Full name' : 'পুরো নাম'} minLength={2} maxLength={80} autoComplete="name" required />
                <Field id="signup-email" name="email" type="email" label={t('email')} maxLength={200} autoComplete="email" required />
                <Field id="signup-password" name="password" type="password" label={t('password')} minLength={12} maxLength={72} autoComplete="new-password" required />
                <Button type="submit" variant="secondary">{isEnglish ? 'Create account' : 'অ্যাকাউন্ট তৈরি করুন'}</Button>
              </form>
            </section>

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

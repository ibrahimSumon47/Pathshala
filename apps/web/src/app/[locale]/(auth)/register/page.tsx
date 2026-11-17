import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Link } from '@/i18n/navigation';
import { accountExists } from '@/lib/auth/account-exists';
import { signUpAction } from '@/lib/auth/actions';
import { cn } from '@/lib/cn';
import ui from '../auth.module.css';

type RegisterPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ signupError?: string }>;
};

/** Learner registration on its own page, so sign-in stays a single, quiet form. */
export default async function RegisterPage({ params, searchParams }: RegisterPageProps) {
  const { locale } = await params;
  const { signupError } = await searchParams;
  const isEnglish = locale === 'en';

  const session = await auth();
  if (session?.user && (await accountExists(session.user.id))) {
    redirect(isEnglish ? '/en/dashboard' : '/dashboard');
  }

  const t = await getTranslations('Auth');

  return (
    <div className={ui.page}>
      <div className={`container ${ui.shell}`}>
        <div className={ui.intro}>
          <p className={ui.eyebrow}>{t('registerEyebrow')}</p>
          <h1 className={ui.title}>{t('registerTitle')}</h1>
          <p className={ui.lede}>{t('registerLede')}</p>
        </div>

        <Card className={cn(ui.panel, ui.stack)}>
          {signupError ? (
            <p className={ui.error} role="alert">
              {signupError === 'exists' ? t('registerExists') : t('registerInvalid')}
            </p>
          ) : null}

          <form id="register-form" action={signUpAction} className={ui.form}>
            <input type="hidden" name="locale" value={locale} />
            <Field
              id="signup-name"
              name="name"
              label={t('registerName')}
              minLength={2}
              maxLength={80}
              autoComplete="name"
              required
            />
            <Field
              id="signup-email"
              name="email"
              type="email"
              label={t('email')}
              maxLength={200}
              autoComplete="email"
              required
            />
            <Field
              id="signup-password"
              name="password"
              type="password"
              label={t('password')}
              hint={t('registerPasswordHint')}
              minLength={12}
              maxLength={72}
              autoComplete="new-password"
              required
            />
            <Button type="submit">{t('registerSubmit')}</Button>
          </form>

          <p className={ui.switch}>
            {t('registerHaveAccount')}{' '}
            <Link href="/sign-in" className={ui.switchLink}>
              {t('registerSignIn')}
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}

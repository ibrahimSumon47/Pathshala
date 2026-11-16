'use server';

import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';
import { signIn, signOut } from '@/auth';

/** Keep redirects inside the language the visitor was using. */
function localeFrom(formData: FormData): 'bn' | 'en' {
  return formData.get('locale') === 'en' ? 'en' : 'bn';
}

/** Dashboard path for a locale; Bangla omits the prefix. */
function dashboardPath(locale: 'bn' | 'en'): string {
  return locale === 'en' ? '/en/dashboard' : '/dashboard';
}

/** Sign in with email and password; failures return to the form with a message. */
export async function signInWithCredentials(formData: FormData) {
  const locale = localeFrom(formData);
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  try {
    await signIn('credentials', { email, password, redirectTo: dashboardPath(locale) });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(locale === 'en' ? '/en/sign-in?error=invalid' : '/sign-in?error=invalid');
    }
    // A successful sign-in throws a Next redirect, which must not be swallowed.
    throw error;
  }
}

/** Start the Google flow; the provider is only rendered when it is configured. */
export async function signInWithGoogle(formData: FormData) {
  const locale = localeFrom(formData);
  await signIn('google', { redirectTo: dashboardPath(locale) });
}

/** Clear the session and return to the public site. */
export async function signOutAction() {
  await signOut({ redirectTo: '/' });
}

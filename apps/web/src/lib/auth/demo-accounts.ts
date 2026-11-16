import type { Locale } from '@pathshala/shared';
import type { UserRole } from '@pathshala/db';

/**
 * Demo accounts are on by default while developing and must be switched on explicitly in
 * production, so a deploy never exposes the admin demo role by accident.
 */
export function demoAuthEnabled(): boolean {
  if (process.env.DEMO_AUTH === 'true') return true;
  if (process.env.DEMO_AUTH === 'false') return false;
  return process.env.NODE_ENV !== 'production';
}

export type DemoAccount = {
  role: UserRole;
  name: string;
  email: string;
  password: string;
  locale: Locale;
};

/**
 * Public demo accounts. These credentials are meant to be shown on the sign-in page so a
 * visitor can try each role; they are not secrets and hold no personal data.
 */
export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  {
    role: 'student',
    name: 'নুসরাত জাহান',
    email: 'student@pathshala.dev',
    password: 'student-demo-2026',
    locale: 'bn',
  },
  {
    role: 'instructor',
    name: 'রফিকুল ইসলাম',
    email: 'instructor@pathshala.dev',
    password: 'instructor-demo-2026',
    locale: 'bn',
  },
  {
    role: 'admin',
    name: 'তানিয়া রহমান',
    email: 'admin@pathshala.dev',
    password: 'admin-demo-2026',
    locale: 'bn',
  },
];

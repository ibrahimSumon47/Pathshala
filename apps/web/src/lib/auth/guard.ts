import 'server-only';
import type { UserRole } from '@pathshala/db';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { hasAnyRole } from './roles';

/** Send signed-out visitors to the sign-in page and return the session user otherwise. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/sign-in');
  }
  return session.user;
}

/**
 * Require one of the given roles. Unauthorised signed-in users get a 404 rather than a
 * redirect, so restricted routes do not advertise that they exist.
 */
export async function requireRole(...allowed: UserRole[]) {
  const user = await requireUser();
  if (!hasAnyRole(user.roles, allowed)) {
    notFound();
  }
  return user;
}

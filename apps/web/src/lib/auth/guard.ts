import 'server-only';
import { User, connectToDatabase } from '@pathshala/db';
import type { UserRole } from '@pathshala/db';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { hasAnyRole } from './roles';

/**
 * A signed JWT can outlive its account, so the record is checked when a database exists.
 * This is what makes "delete my account" take effect immediately.
 */
async function accountStillExists(userId: string): Promise<boolean> {
  if (!process.env.MONGODB_URI) return true;
  if (!/^[a-f0-9]{24}$/i.test(userId)) return true;
  await connectToDatabase();
  return Boolean(await User.exists({ _id: userId }));
}

/** Send signed-out visitors to the sign-in page and return the session user otherwise. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/sign-in');
  }
  if (!(await accountStillExists(session.user.id))) {
    redirect('/sign-in?deleted=1');
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

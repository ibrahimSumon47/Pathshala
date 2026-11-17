'use server';

import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  Bookmark,
  Cart,
  Certificate,
  Enrolment,
  LearningEvent,
  Note,
  Notification,
  QuizAttempt,
  Reminder,
  Review,
  User,
  Wishlist,
  connectToDatabase,
} from '@pathshala/db';
import { z } from 'zod';
import { signOut } from '@/auth';
import { requireUser } from '@/lib/auth/guard';
import { THEME_COOKIE } from '@/lib/theme';

const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const AVATAR_LIMIT = 200 * 1024;

function path(form: FormData, suffix: string): string {
  return `${form.get('locale') === 'en' ? '/en' : ''}${suffix}`;
}

/** Send the reader back with one readable message instead of a stack trace. */
function back(form: FormData, message: string, ok = false): never {
  const query = ok ? 'saved' : 'error';
  redirect(`${path(form, '/dashboard/settings')}?${query}=${encodeURIComponent(message)}`);
}

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Write your name.').max(80),
  locale: z.enum(['bn', 'en']),
});

/** Save the display name, language and an uploaded avatar. */
export async function updateProfileAction(form: FormData): Promise<void> {
  const session = await requireUser();
  const parsed = profileSchema.safeParse({ name: String(form.get('name') ?? ''), locale: String(form.get('locale') ?? 'bn') });
  if (!parsed.success) back(form, parsed.error.issues[0]?.message ?? 'Check your details.');
  await connectToDatabase();

  const update: Record<string, unknown> = { name: parsed.data.name, locale: parsed.data.locale };
  const avatar = form.get('avatar');
  if (avatar instanceof File && avatar.size > 0) {
    if (!AVATAR_TYPES.includes(avatar.type)) back(form, 'Use a PNG, JPEG or WebP image.');
    if (avatar.size > AVATAR_LIMIT) back(form, 'Keep the photo under 200 KB.');
    const base64 = Buffer.from(await avatar.arrayBuffer()).toString('base64');
    update.image = `data:${avatar.type};base64,${base64}`;
  }
  if (form.get('removeAvatar') === 'on') update.image = '';

  await User.updateOne({ _id: session.id }, update);
  revalidatePath('/dashboard/settings');
  const next = parsed.data.locale === 'en' ? '/en' : '';
  redirect(`${next}/dashboard/settings?saved=${encodeURIComponent('Profile saved.')}`);
}

/** Store appearance and notification preferences; the theme cookie is written too. */
export async function updatePreferencesAction(form: FormData): Promise<void> {
  const session = await requireUser();
  const theme = String(form.get('theme') ?? 'system');
  if (!['light', 'dark', 'system'].includes(theme)) back(form, 'Choose a theme.');

  const jar = await cookies();
  if (theme === 'system') jar.delete(THEME_COOKIE);
  else jar.set(THEME_COOKIE, theme === 'dark' ? 'dark' : 'light', { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });

  await connectToDatabase();
  await User.updateOne(
    { _id: session.id },
    {
      theme,
      notificationPrefs: {
        reminders: form.get('reminders') === 'on',
        announcements: form.get('announcements') === 'on',
        replies: form.get('replies') === 'on',
      },
    },
  );
  revalidatePath('/dashboard/settings');
  back(form, 'Preferences saved.', true);
}

const passwordSchema = z
  .object({
    current: z.string().min(8).max(72),
    next: z
      .string()
      .min(12, 'Use at least 12 characters.')
      .max(72)
      .regex(/[a-zA-Z]/, 'Include a letter.')
      .regex(/[0-9]/, 'Include a number.'),
    confirm: z.string().min(1),
  })
  .refine((value) => value.next === value.confirm, { message: 'The new passwords do not match.' });

/** Change the password after proving the current one. */
export async function changePasswordAction(form: FormData): Promise<void> {
  const session = await requireUser();
  const parsed = passwordSchema.safeParse({
    current: String(form.get('current') ?? ''),
    next: String(form.get('next') ?? ''),
    confirm: String(form.get('confirm') ?? ''),
  });
  if (!parsed.success) back(form, parsed.error.issues[0]?.message ?? 'Check the new password.');

  await connectToDatabase();
  const user = await User.findById(session.id).select('+passwordHash').lean();
  if (!user?.passwordHash) back(form, 'This account cannot change its password here.');
  const matches = await bcrypt.compare(parsed.data.current, user.passwordHash);
  if (!matches) back(form, 'The current password is not right.');
  if (await bcrypt.compare(parsed.data.next, user.passwordHash)) back(form, 'Choose a password you have not used here.');

  await User.updateOne({ _id: session.id }, { passwordHash: await bcrypt.hash(parsed.data.next, 12) });
  back(form, 'Password changed.', true);
}

/** Delete the account and its personal rows once the reader proves it is really them. */
export async function deleteAccountAction(form: FormData): Promise<void> {
  const session = await requireUser();
  const password = String(form.get('password') ?? '');
  const confirmation = String(form.get('confirmation') ?? '').trim();
  const expected = String(form.get('locale') === 'en' ? 'DELETE' : 'মুছুন');
  if (confirmation !== expected) back(form, `Type ${expected} to confirm.`);

  await connectToDatabase();
  const user = await User.findById(session.id).select('+passwordHash').lean();
  if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    back(form, 'The password is not right, so nothing was deleted.');
  }

  await Promise.all([
    Enrolment.deleteMany({ student: session.id }),
    Note.deleteMany({ student: session.id }),
    Bookmark.deleteMany({ student: session.id }),
    Wishlist.deleteMany({ student: session.id }),
    Notification.deleteMany({ user: session.id }),
    QuizAttempt.deleteMany({ student: session.id }),
    Review.deleteMany({ student: session.id }),
    LearningEvent.deleteMany({ student: session.id }),
    Certificate.deleteMany({ student: session.id }),
    Reminder.deleteMany({ student: session.id }),
    Cart.deleteOne({ user: session.id }),
  ]);
  // Orders stay for the accounting trail; they never held the email or name.
  await User.deleteOne({ _id: session.id });
  // The signed token outlives the record, so clear the cookie before leaving.
  await signOut({ redirectTo: `${path(form, '/sign-in')}?deleted=1` });
}

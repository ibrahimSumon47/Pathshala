'use server';

import { updateProfileForUser } from '@pathshala/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/guard';
import { profileDetailsSchema } from '@/lib/profile';

/** Save the name and the two language columns of the profile. */
export async function updateProfileDetailsAction(form: FormData): Promise<void> {
  const session = await requireUser();
  const parsed = profileDetailsSchema.safeParse({
    name: String(form.get('name') ?? ''),
    headlineBn: String(form.get('headlineBn') ?? ''),
    headlineEn: String(form.get('headlineEn') ?? ''),
    bioBn: String(form.get('bioBn') ?? ''),
    bioEn: String(form.get('bioEn') ?? ''),
  });
  const localePath = form.get('locale') === 'en' ? '/en' : '';
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Check your details.';
    redirect(`${localePath}/dashboard/profile?error=${encodeURIComponent(message)}`);
  }

  await updateProfileForUser(session.id, {
    name: parsed.data.name,
    headline: parsed.data.headlineBn,
    headlineEn: parsed.data.headlineEn,
    bio: parsed.data.bioBn,
    bioEn: parsed.data.bioEn,
  });
  revalidatePath('/dashboard/profile');
  revalidatePath(`/instructors/${session.id}`);
  // The masthead shows the account name, so refresh it too when a layout is re-rendered.
  revalidatePath('/dashboard');
  redirect(`${localePath}/dashboard/profile?saved=${encodeURIComponent('Profile saved.')}`);
}

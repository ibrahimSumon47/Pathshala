'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSavedSearch } from '@pathshala/db';
import { requireUser } from '@/lib/auth/guard';

function base(form: FormData): string {
  return `${form.get('locale') === 'en' ? '/en' : ''}/dashboard/saved-searches`;
}

/** Save the filters behind an empty result so the next matching course reaches the inbox. */
export async function saveCatalogueSearchAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const level = String(form.get('level') ?? '');
  const language = String(form.get('language') ?? '');
  const price = String(form.get('price') ?? 'all');
  const maxPricePaisa =
    price === 'free' ? 0 : price === 'under-500' ? 49_999 : price === '500-1500' ? 150_000 : null;
  const query = String(form.get('q') ?? '').trim().slice(0, 80);
  const label = String(form.get('label') ?? '').trim().slice(0, 80) || query || 'Catalogue search';

  const result = await createSavedSearch(user.id, {
    label,
    query,
    level: level === 'beginner' || level === 'intermediate' || level === 'advanced' ? level : '',
    language: language === 'bn' || language === 'en' ? language : '',
    maxPricePaisa,
  });
  if (result === 'limit') redirect(`${base(form)}?error=${encodeURIComponent('Ten saved searches is the limit.')}`);
  if (result === 'invalid') {
    redirect(`${base(form)}?error=${encodeURIComponent('Choose a search or filter before saving.')}`);
  }
  revalidatePath('/dashboard/saved-searches');
  redirect(`${base(form)}?saved=1`);
}

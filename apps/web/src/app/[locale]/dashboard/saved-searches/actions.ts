'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { checkSavedSearches, createSavedSearch, deleteSavedSearch } from '@pathshala/db';
import { toPaisa } from '@pathshala/shared';
import { requireUser } from '@/lib/auth/guard';

function base(form: FormData): string {
  return `${form.get('locale') === 'en' ? '/en' : ''}/dashboard/saved-searches`;
}

/** Save one set of catalogue filters for later and for in-app new-course notes. */
export async function createSavedSearchAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const level = String(form.get('level') ?? '');
  const language = String(form.get('language') ?? '');
  const maxPrice = Number(String(form.get('maxPriceTaka') ?? '0'));
  const result = await createSavedSearch(user.id, {
    label: String(form.get('label') ?? ''),
    query: String(form.get('query') ?? ''),
    level: level === 'beginner' || level === 'intermediate' || level === 'advanced' ? level : '',
    language: language === 'bn' || language === 'en' ? language : '',
    maxPricePaisa: maxPrice > 0 ? toPaisa(maxPrice) : null,
  });
  if (result === 'invalid') redirect(`${base(form)}?error=${encodeURIComponent('Add a label and at least one filter.')}`);
  if (result === 'limit') redirect(`${base(form)}?error=${encodeURIComponent('Ten saved searches is the limit.')}`);
  revalidatePath('/dashboard/saved-searches');
  redirect(`${base(form)}?saved=1`);
}

export async function deleteSavedSearchAction(form: FormData): Promise<void> {
  const user = await requireUser();
  await deleteSavedSearch(user.id, String(form.get('searchId') ?? ''));
  revalidatePath('/dashboard/saved-searches');
  redirect(`${base(form)}?saved=1`);
}

/** Re-run every saved search now and report how many new courses were found. */
export async function checkSavedSearchesAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const result = await checkSavedSearches(user.id);
  revalidatePath('/dashboard/saved-searches');
  redirect(`${base(form)}?checked=${result.newMatches}`);
}

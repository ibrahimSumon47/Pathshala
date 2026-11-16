'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Category, connectToDatabase } from '@pathshala/db';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/guard';

const categorySchema = z.object({
  nameBn: z.string().trim().min(2).max(80),
  nameEn: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  order: z.coerce.number().int().min(0).max(999),
});

function localePath(form: FormData, path: string): string {
  return `${form.get('locale') === 'en' ? '/en' : ''}${path}`;
}

/** Add a subject category; both languages are required because categories are navigation. */
export async function createCategoryAction(form: FormData): Promise<void> {
  await requireRole('admin');
  const parsed = categorySchema.safeParse({
    nameBn: String(form.get('nameBn') ?? ''),
    nameEn: String(form.get('nameEn') ?? ''),
    slug: String(form.get('slug') ?? ''),
    order: String(form.get('order') ?? '0'),
  });
  if (!parsed.success) {
    redirect(`${localePath(form, '/admin')}?error=${encodeURIComponent('Check the category fields.')}`);
  }

  await connectToDatabase();
  try {
    await Category.create({
      name: { bn: parsed.data.nameBn, en: parsed.data.nameEn },
      slug: parsed.data.slug,
      order: parsed.data.order,
      isActive: true,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('duplicate key')) {
      redirect(`${localePath(form, '/admin')}?error=${encodeURIComponent('That slug already exists.')}`);
    }
    throw error;
  }
  revalidatePath('/admin');
  revalidatePath('/courses');
  redirect(`${localePath(form, '/admin')}?saved=1`);
}

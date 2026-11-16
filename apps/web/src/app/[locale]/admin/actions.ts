'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Category, connectToDatabase, setCourseStatus, setInstructorAccess } from '@pathshala/db';
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

/** Admin approval: publish, unpublish or archive a course, with an audit row. */
export async function setCourseStatusAction(form: FormData): Promise<void> {
  const user = await requireRole('admin');
  const courseId = String(form.get('courseId') ?? '');
  const status = String(form.get('status') ?? '');
  if (!['draft', 'pending', 'published', 'archived'].includes(status)) {
    redirect(`${localePath(form, '/admin')}?error=${encodeURIComponent('Unknown course status.')}`);
  }
  const ok = await setCourseStatus(courseId, status as 'draft' | 'pending' | 'published' | 'archived', user.id);
  if (!ok) redirect(`${localePath(form, '/admin')}?error=${encodeURIComponent('Course not found.')}`);
  revalidatePath('/admin');
  revalidatePath('/courses');
  redirect(`${localePath(form, '/admin')}?saved=1`);
}

/** Grant or revoke instructor access for a normal account; admins cannot be changed here. */
export async function setInstructorAccessAction(form: FormData): Promise<void> {
  const user = await requireRole('admin');
  const userId = String(form.get('userId') ?? '');
  const grant = form.get('grant') === 'true';
  const ok = await setInstructorAccess(userId, grant, user.id);
  if (!ok) redirect(`${localePath(form, '/admin')}?error=${encodeURIComponent('That account cannot be changed.')}`);
  revalidatePath('/admin');
  redirect(`${localePath(form, '/admin')}?saved=1`);
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

'use server';

import { Bookmark, Note, Wishlist, addToCart, connectToDatabase } from '@pathshala/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/guard';

function path(form: FormData, suffix: string): string {
  return `${form.get('locale') === 'en' ? '/en' : ''}${suffix}`;
}

/** Remove one saved course from its owner's wishlist. */
export async function removeWishlistAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const courseId = String(form.get('courseId') ?? '');
  await connectToDatabase();
  await Wishlist.deleteOne({ student: user.id, course: courseId });
  revalidatePath('/dashboard/wishlist');
  redirect(path(form, '/dashboard/wishlist'));
}

/** Move a saved course into the cart in one step. */
export async function wishlistToCartAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const courseId = String(form.get('courseId') ?? '');
  const result = await addToCart(user.id, courseId);
  if (result === 'added') {
    await connectToDatabase();
    await Wishlist.deleteOne({ student: user.id, course: courseId });
  }
  revalidatePath('/dashboard/wishlist');
  redirect(result === 'added' ? path(form, '/cart') : path(form, '/dashboard/wishlist'));
}

/** Drop a lesson bookmark. */
export async function removeBookmarkAction(form: FormData): Promise<void> {
  const user = await requireUser();
  await connectToDatabase();
  await Bookmark.deleteOne({ _id: String(form.get('id') ?? ''), student: user.id });
  revalidatePath('/dashboard/notes');
  redirect(path(form, '/dashboard/notes'));
}

/** Delete one private note. */
export async function deleteNoteAction(form: FormData): Promise<void> {
  const user = await requireUser();
  await connectToDatabase();
  await Note.deleteOne({ _id: String(form.get('id') ?? ''), student: user.id });
  revalidatePath('/dashboard/notes');
  redirect(path(form, '/dashboard/notes'));
}

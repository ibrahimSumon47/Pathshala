'use server';

import { randomUUID } from 'node:crypto';
import {
  CommerceError,
  addToCart,
  clearCart,
  createOrderForCourses,
  getCartView,
  removeFromCart,
  setCartCoupon,
} from '@pathshala/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/guard';

function path(form: FormData, suffix: string): string {
  return `${form.get('locale') === 'en' ? '/en' : ''}${suffix}`;
}

function back(form: FormData, message: string, ok = false): never {
  redirect(`${path(form, '/cart')}?${ok ? 'saved' : 'error'}=${encodeURIComponent(message)}`);
}

/** Add one paid course to the cart; free courses go straight to enrolment. */
export async function addToCartAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const courseId = String(form.get('courseId') ?? '');
  const slug = String(form.get('slug') ?? '');
  const result = await addToCart(user.id, courseId);
  if (result === 'free') redirect(path(form, `/courses/${slug}`));
  if (result === 'missing') redirect(`${path(form, `/courses/${slug}`)}?error=${encodeURIComponent('Course not found.')}`);
  revalidatePath('/cart');
  redirect(`${path(form, '/cart')}?saved=${encodeURIComponent('Added to your cart.')}`);
}

/** Remove one course from the cart. */
export async function removeFromCartAction(form: FormData): Promise<void> {
  const user = await requireUser();
  await removeFromCart(user.id, String(form.get('courseId') ?? ''));
  revalidatePath('/cart');
  redirect(path(form, '/cart'));
}

/** Store a coupon code; the cart page reports whether it was valid. */
export async function applyCartCouponAction(form: FormData): Promise<void> {
  const user = await requireUser();
  await setCartCoupon(user.id, String(form.get('code') ?? ''));
  revalidatePath('/cart');
  redirect(path(form, '/cart'));
}

/** Clear the coupon and restore list prices. */
export async function clearCartCouponAction(form: FormData): Promise<void> {
  const user = await requireUser();
  await setCartCoupon(user.id, '');
  revalidatePath('/cart');
  redirect(path(form, '/cart'));
}

/** Turn the whole cart into one pending order and open its checkout. */
export async function checkoutCartAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const cart = await getCartView(user.id);
  if (cart.courses.length === 0) back(form, 'Your cart is empty.');
  try {
    const order = await createOrderForCourses({
      userId: user.id,
      courseIds: cart.courses.map((course) => course.id),
      couponCode: cart.couponCode ?? '',
      idempotencyKey: randomUUID(),
    });
    await clearCart(user.id);
    revalidatePath('/cart');
    redirect(path(form, `/checkout/${order.orderNumber}`));
  } catch (error) {
    if (error instanceof CommerceError) back(form, error.message);
    throw error;
  }
}

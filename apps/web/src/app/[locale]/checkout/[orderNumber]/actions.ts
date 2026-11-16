'use server';

import { randomUUID } from 'node:crypto';
import {
  CommerceError,
  applyCouponToOrder,
  createOrder,
  getOrderForUser,
  setOrderProvider,
  type PaymentProvider,
} from '@pathshala/db';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/guard';
import { createPayBridgeSession } from '@/lib/payments/paybridge';
import { createStripeCheckoutSession } from '@/lib/payments/stripe';

function path(form: FormData, suffix: string): string {
  return `${form.get('locale') === 'en' ? '/en' : ''}${suffix}`;
}

function fail(form: FormData, orderNumber: string, message: string): never {
  redirect(`${path(form, `/checkout/${orderNumber}`)}?error=${encodeURIComponent(message)}`);
}

function origin(): string {
  return (process.env.APP_URL ?? 'http://localhost:59800').replace(/\/$/, '');
}

/** Create a pending order for a paid course and open its test checkout. */
export async function startCheckoutAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const courseId = String(form.get('courseId') ?? '');
  const slug = String(form.get('slug') ?? '');
  try {
    const order = await createOrder({ userId: user.id, courseId, idempotencyKey: randomUUID() });
    redirect(path(form, `/checkout/${order.orderNumber}`));
  } catch (error) {
    if (error instanceof CommerceError) {
      if (error.code === 'already_enrolled') redirect(path(form, `/learn/${slug}`));
      redirect(`${path(form, `/courses/${slug}`)}?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }
}

/** Apply a coupon to this pending order. */
export async function applyCouponAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const orderNumber = String(form.get('orderNumber') ?? '');
  try {
    await applyCouponToOrder(orderNumber, user.id, String(form.get('code') ?? ''));
    redirect(path(form, `/checkout/${orderNumber}?coupon=1`));
  } catch (error) {
    if (error instanceof CommerceError) fail(form, orderNumber, error.message);
    throw error;
  }
}

/** Clear a coupon and restore the course price. */
export async function removeCouponAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const orderNumber = String(form.get('orderNumber') ?? '');
  try {
    await applyCouponToOrder(orderNumber, user.id, '');
    redirect(path(form, `/checkout/${orderNumber}`));
  } catch (error) {
    if (error instanceof CommerceError) fail(form, orderNumber, error.message);
    throw error;
  }
}

/** Start a Stripe test checkout when a sandbox secret key exists. */
export async function payWithStripeAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const orderNumber = String(form.get('orderNumber') ?? '');
  const order = await getOrderForUser(orderNumber, user.id);
  if (!order) fail(form, orderNumber, 'Order not found.');
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) fail(form, orderNumber, 'Stripe test keys are not configured; use PayBridge for now.');
  await setOrderProvider(orderNumber, user.id, 'stripe');
  const success = `${origin()}${path(form, `/checkout/${orderNumber}`)}?paid=1`;
  const cancel = `${origin()}${path(form, `/checkout/${orderNumber}`)}?cancelled=1`;
  resultRedirect(await createStripeCheckoutSession(secretKey, order, success, cancel), form, orderNumber);
}

/** Start a PayBridge sandbox checkout; no external account is needed. */
export async function payWithPayBridgeAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const orderNumber = String(form.get('orderNumber') ?? '');
  const order = await getOrderForUser(orderNumber, user.id);
  if (!order) fail(form, orderNumber, 'Order not found.');
  const baseUrl = process.env.PAYBRIDGE_BASE_URL;
  const apiKey = process.env.PAYBRIDGE_API_KEY;
  if (!baseUrl || !apiKey) fail(form, orderNumber, 'PayBridge is not configured; set its URL and API key.');
  await setOrderProvider(orderNumber, user.id, 'paybridge' as PaymentProvider);
  const session = await createPayBridgeSession(
    { baseUrl, apiKey },
    {
      orderRef: orderNumber,
      amountPaisa: order.totalPaisa,
      description: order.courseTitle.en ?? order.courseTitle.bn ?? 'Pathshala course',
      customerName: user.name ?? 'Pathshala learner',
      customerEmail: user.email ?? 'learner@pathshala.dev',
      returnUrl: `${origin()}${path(form, `/checkout/${orderNumber}`)}`,
      webhookUrl: `${origin()}/api/payments/paybridge/webhook`,
    },
  );
  redirect(session.url);
}

/** A missing gateway URL is a configuration error, never a silent success. */
function resultRedirect(
  session: { url: string } | null,
  form: FormData,
  orderNumber: string,
): never {
  if (!session) fail(form, orderNumber, 'That payment method is not configured.');
  redirect(session.url);
}

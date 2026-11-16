import { NextResponse } from 'next/server';
import { z } from 'zod';
import { hashApiKey } from '@/lib/auth';
import { CheckoutSession, Merchant, connectGateway } from '@/lib/models';

const schema = z.object({
  orderRef: z.string().trim().min(3).max(80),
  amountPaisa: z.number().int().positive().max(100_000_000),
  description: z.string().trim().min(2).max(200),
  customerName: z.string().trim().min(1).max(120),
  customerEmail: z.string().trim().email().max(200),
  returnUrl: z.string().url().max(2000),
  webhookUrl: z.string().url().max(2000),
});

/** Authenticate a merchant key; local bootstrap creates the demo merchant on first use. */
async function merchantFor(authorization: string | null) {
  const key = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!key) return null;
  const apiKeyHash = hashApiKey(key);
  const existing = await Merchant.findOne({ apiKeyHash });
  if (existing) return existing;
  if (process.env.PAYBRIDGE_ALLOW_BOOTSTRAP !== 'true' || !key.startsWith('pb_test_')) return null;
  const webhookSecret = process.env.PAYBRIDGE_WEBHOOK_SECRET;
  if (!webhookSecret) return null;
  try {
    return await Merchant.create({
      name: 'Pathshala',
      slug: 'pathshala',
      apiKeyHash,
      apiKeyPrefix: key.slice(0, 16),
      webhookSecret,
    });
  } catch {
    return Merchant.findOne({ apiKeyHash });
  }
}

/** Merchant API: create (or idempotently reuse) a hosted test checkout session. */
export async function POST(request: Request) {
  await connectGateway();
  const merchant = await merchantFor(request.headers.get('authorization'));
  if (!merchant) {
    return NextResponse.json({ error: { code: 'unauthorized', message: 'A valid test API key is required.' } }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'validation_failed', message: parsed.error.issues[0]?.message ?? 'Invalid input.' } }, { status: 400 });
  }

  const existing = await CheckoutSession.findOne({ merchant: merchant._id, orderRef: parsed.data.orderRef });
  if (existing) {
    return NextResponse.json({ id: String(existing._id), url: `${originFor(request)}/checkout/${String(existing._id)}`, testMode: true });
  }

  const session = await CheckoutSession.create({ merchant: merchant._id, ...parsed.data, currency: 'BDT', status: 'pending' });
  return NextResponse.json(
    { id: String(session._id), url: `${originFor(request)}/checkout/${String(session._id)}`, testMode: true },
    { status: 201 },
  );
}

/** Prefer the configured public origin; the request origin is correct locally and on Vercel. */
function originFor(request: Request): string {
  return (process.env.PAYBRIDGE_PUBLIC_URL ?? new URL(request.url).origin).replace(/\/$/, '');
}

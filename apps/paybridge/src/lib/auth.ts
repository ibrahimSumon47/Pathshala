import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Merchant, connectGateway, type MerchantRecord } from './models';

const COOKIE = 'paybridge_dashboard';
const MAX_AGE_SECONDS = 60 * 60 * 8;

/** Store only hashes of merchant API keys; the prefix is safe to show in the dashboard. */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/** Create a test API key and its display prefix. */
export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const key = `pb_test_${randomBytes(24).toString('hex')}`;
  return { key, hash: hashApiKey(key), prefix: key.slice(0, 16) };
}

/** Sign the dashboard cookie with a server-only secret. */
function signDashboard(merchantId: string, expiresAt: number): string {
  const secret = process.env.PAYBRIDGE_DASHBOARD_SECRET;
  if (!secret) throw new Error('PAYBRIDGE_DASHBOARD_SECRET is required');
  return createHmac('sha256', secret).update(`${merchantId}.${expiresAt}`).digest('hex');
}

/** Constant-time check of a dashboard cookie token. */
function verifyDashboardToken(token: string | undefined): string | null {
  if (!token) return null;
  const [merchantId, expires, signature] = token.split('.');
  if (!merchantId || !expires || !signature) return null;
  const expiresAt = Number.parseInt(expires, 10);
  if (!Number.isInteger(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) return null;
  const expected = signDashboard(merchantId, expiresAt);
  const provided = Buffer.from(signature, 'hex');
  const wanted = Buffer.from(expected, 'hex');
  return provided.length === wanted.length && timingSafeEqual(provided, wanted) ? merchantId : null;
}

/** Set the signed dashboard cookie after a successful password check. */
export async function setDashboardCookie(merchantId: string): Promise<void> {
  const expiresAt = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const store = await cookies();
  store.set(COOKIE, `${merchantId}.${expiresAt}.${signDashboard(merchantId, expiresAt)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

/** Clear the dashboard cookie. */
export async function clearDashboardCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

/** The signed-in merchant, or null when the cookie is absent or stale. */
export async function currentMerchant(): Promise<MerchantRecord | null> {
  const store = await cookies();
  const merchantId = verifyDashboardToken(store.get(COOKIE)?.value);
  if (!merchantId) return null;
  await connectGateway();
  return (await Merchant.findById(merchantId).lean()) as unknown as MerchantRecord | null;
}

/** Dashboard pages call this before reading merchant data. */
export async function requireMerchant(): Promise<MerchantRecord> {
  const merchant = await currentMerchant();
  if (!merchant) redirect('/login');
  return merchant;
}

/** Demo dashboard password, compared without leaking length through early returns. */
export function passwordMatches(input: string): boolean {
  const expected = process.env.PAYBRIDGE_DASHBOARD_PASSWORD;
  if (!expected) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

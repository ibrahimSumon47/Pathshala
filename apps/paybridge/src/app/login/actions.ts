'use server';

import { redirect } from 'next/navigation';
import { clearDashboardCookie, passwordMatches, setDashboardCookie } from '@/lib/auth';
import { Merchant, connectGateway } from '@/lib/models';

/** Sign into the demo merchant dashboard with the environment password. */
export async function loginAction(form: FormData): Promise<void> {
  const password = String(form.get('password') ?? '');
  if (!passwordMatches(password)) redirect(`/login?error=${encodeURIComponent('That password is not right.')}`);
  await connectGateway();
  let merchant = await Merchant.findOne().sort({ createdAt: 1 });
  if (!merchant) {
    const apiKey = process.env.PAYBRIDGE_API_KEY;
    const webhookSecret = process.env.PAYBRIDGE_WEBHOOK_SECRET;
    if (apiKey && webhookSecret) {
      const { hashApiKey } = await import('@/lib/auth');
      merchant = await Merchant.create({
        name: 'Pathshala',
        slug: 'pathshala',
        apiKeyHash: hashApiKey(apiKey),
        apiKeyPrefix: apiKey.slice(0, 16),
        webhookSecret,
      });
    }
  }
  if (!merchant) redirect(`/login?error=${encodeURIComponent('Start a checkout session first, then sign in.')}`);
  await setDashboardCookie(String(merchant._id));
  redirect('/dashboard');
}

/** Sign out and return to the login screen. */
export async function logoutAction(): Promise<void> {
  await clearDashboardCookie();
  redirect('/login');
}

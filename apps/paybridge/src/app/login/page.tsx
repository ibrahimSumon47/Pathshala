import { redirect } from 'next/navigation';
import { currentMerchant } from '@/lib/auth';
import { loginAction } from './actions';

type LoginProps = { searchParams: Promise<{ error?: string }> };

/** Password gate for the merchant dashboard. */
export default async function LoginPage({ searchParams }: LoginProps) {
  const { error } = await searchParams;
  if (await currentMerchant()) redirect('/dashboard');
  const configured = Boolean(process.env.PAYBRIDGE_DASHBOARD_PASSWORD);

  return (
    <main>
      <div className="container" style={{ maxWidth: 440 }}>
        <p className="eyebrow">PayBridge sandbox</p>
        <h1 style={{ marginTop: '0.5rem' }}>Merchant sign in</h1>
        <p className="muted" style={{ marginTop: '0.6rem' }}>
          Test mode only. The demo password lives in the local environment, never in the repository.
        </p>
        {error ? <p className="alert error" style={{ marginTop: '1rem' }}>{error}</p> : null}
        {!configured ? (
          <p className="alert error" style={{ marginTop: '1rem' }}>
            Set <span className="mono">PAYBRIDGE_DASHBOARD_PASSWORD</span> in <span className="mono">apps/paybridge/.env.local</span>.
          </p>
        ) : null}
        <form action={loginAction} className="panel stack" style={{ marginTop: '1.4rem' }}>
          <div className="field">
            <label htmlFor="password">Dashboard password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          <button className="button" type="submit">Sign in</button>
        </form>
      </div>
    </main>
  );
}

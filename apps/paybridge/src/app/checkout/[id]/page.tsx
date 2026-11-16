import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckoutSession, Merchant, connectGateway, type CheckoutSessionRecord, type MerchantRecord } from '@/lib/models';
import { payAction } from './actions';

type CheckoutProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

/** Format integer paisa as taka for the hosted checkout. */
function taka(paisa: number): string {
  return `৳${(paisa / 100).toLocaleString('en-BD', { maximumFractionDigits: 0 })}`;
}

/** Hosted, test-mode checkout page shown to the payer. */
export default async function CheckoutPage({ params, searchParams }: CheckoutProps) {
  const { id } = await params;
  const { error } = await searchParams;
  await connectGateway();
  const session = (await CheckoutSession.findById(id).lean()) as unknown as CheckoutSessionRecord | null;
  if (!session) notFound();
  const merchant = (await Merchant.findById(session.merchant).lean()) as unknown as MerchantRecord | null;

  return (
    <main>
      <div className="container" style={{ maxWidth: 860 }}>
        <header className="topbar" style={{ marginBottom: '2rem', borderRadius: 12, paddingInline: '1rem' }}>
          <div className="topbar-inner">
            <Link href="/dashboard" className="brand">
              Pay<span>Bridge</span>
            </Link>
            <span className="small muted">Sandbox gateway</span>
          </div>
        </header>

        <p className="test-banner">
          <span>Test mode</span>
          <span>No real money moves. Use card <code>4242 4242 4242 4242</code>, any future expiry and any CVC.</span>
        </p>
        {error ? <p className="alert error" role="alert">{error}</p> : null}

        <div className="grid">
          <section className="panel stack">
            {session.status === 'paid' ? (
              <>
                <span className="badge">Paid</span>
                <h1>{taka(session.amountPaisa)}</h1>
                <p className="muted">{session.description}</p>
                <div className="receipt">
                  <strong>PayBridge test receipt</strong>
                  <span>Order {session.orderRef}</span>
                  <span>Card ending {session.cardLast4}</span>
                  <span>{session.paidAt?.toLocaleString('en-GB')}</span>
                </div>
                <p className="alert success">The merchant was notified with a signed webhook. You can close this tab.</p>
                <a className="button secondary" href={session.returnUrl}>
                  Return to {merchant?.name ?? 'merchant'}
                </a>
              </>
            ) : session.status === 'refunded' ? (
              <>
                <span className="badge refund">Refunded</span>
                <h1>{taka(session.amountPaisa)}</h1>
                <p className="muted">This test payment was refunded and the merchant was notified.</p>
                <a className="button secondary" href={session.returnUrl}>
                  Return to {merchant?.name ?? 'merchant'}
                </a>
              </>
            ) : (
              <>
                <p className="eyebrow">{merchant?.name ?? 'Merchant'} · test checkout</p>
                <h1>{taka(session.amountPaisa)}</h1>
                <p className="muted">{session.description}</p>
                <form action={payAction} className="stack">
                  <input type="hidden" name="sessionId" value={String(session._id)} />
                  <div className="field">
                    <label htmlFor="card">Card number</label>
                    <input id="card" name="card" inputMode="numeric" autoComplete="off" defaultValue="4242 4242 4242 4242" required />
                  </div>
                  <div className="field-row">
                    <div className="field">
                      <label htmlFor="expiry">Expiry</label>
                      <input id="expiry" name="expiry" placeholder="12/34" defaultValue="12/34" required />
                    </div>
                    <div className="field">
                      <label htmlFor="cvc">CVC</label>
                      <input id="cvc" name="cvc" inputMode="numeric" defaultValue="123" required />
                    </div>
                  </div>
                  <button className="button" type="submit">
                    Pay {taka(session.amountPaisa)} in test mode
                  </button>
                </form>
              </>
            )}
          </section>

          <aside className="panel stack">
            <p className="eyebrow">Paying</p>
            <h2>{merchant?.name ?? 'Merchant'}</h2>
            <p className="small muted">
              {session.customerName} · {session.customerEmail}
            </p>
            <hr style={{ border: 0, borderTop: '1px solid var(--line)', width: '100%' }} />
            <p className="small">Order <span className="mono">{session.orderRef}</span></p>
            <p className="small muted">
              PayBridge is a sandbox gateway built for this portfolio. Signing, retries, receipts and refunds are real; the
              money is not.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}

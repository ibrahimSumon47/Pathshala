import Link from 'next/link';
import { requireMerchant } from '@/lib/auth';
import {
  CheckoutSession,
  Delivery,
  GatewayLedger,
  connectGateway,
  type CheckoutSessionRecord,
  type DeliveryRecord,
  type GatewayLedgerRecord,
} from '@/lib/models';
import { logoutAction } from '../login/actions';
import { refundAction, resendAction, rotateKeyAction } from './actions';

type DashboardProps = {
  searchParams: Promise<{ refunded?: string; resent?: string; error?: string }>;
};

/** Format integer paisa as taka. */
function taka(paisa: number): string {
  return `৳${(paisa / 100).toLocaleString('en-BD', { maximumFractionDigits: 0 })}`;
}

/** Merchant home: balance, transactions, API key and webhook deliveries. */
export default async function DashboardPage({ searchParams }: DashboardProps) {
  const { refunded, resent, error } = await searchParams;
  const merchant = await requireMerchant();
  await connectGateway();
  const [sessions, ledger, deliveries] = (await Promise.all([
    CheckoutSession.find({ merchant: merchant._id }).sort({ createdAt: -1 }).limit(25).lean(),
    GatewayLedger.find({ merchant: merchant._id }).sort({ createdAt: -1 }).limit(100).lean(),
    Delivery.find({ merchant: merchant._id }).sort({ createdAt: -1 }).limit(12).lean(),
  ])) as unknown as [CheckoutSessionRecord[], GatewayLedgerRecord[], DeliveryRecord[]];
  const charged = ledger.filter((entry) => entry.type === 'charge').reduce((total, entry) => total + entry.amountPaisa, 0);
  const refundedTotal = ledger.filter((entry) => entry.type === 'refund').reduce((total, entry) => total + entry.amountPaisa, 0);

  return (
    <main>
      <div className="container">
        <div className="topbar" style={{ marginBottom: '2rem', borderRadius: 12, paddingInline: '1rem' }}>
          <div className="topbar-inner">
            <Link href="/dashboard" className="brand">
              Pay<span>Bridge</span>
            </Link>
            <nav className="nav">
              <span className="small muted">Test mode · {merchant.name}</span>
              <form action={logoutAction}>
                <button className="button secondary small" type="submit">
                  Sign out
                </button>
              </form>
            </nav>
          </div>
        </div>

        <p className="test-banner">
          <span>Test mode</span>
          <span>All charges, refunds and webhooks are sandbox events. No card is charged.</span>
        </p>
        {refunded ? <p className="alert success">Refund recorded and the merchant webhook was sent.</p> : null}
        {resent ? <p className="alert success">Webhook delivery attempted again.</p> : null}
        {error ? <p className="alert error">{error}</p> : null}

        <div className="grid" style={{ marginTop: '1rem' }}>
          <section className="stack">
            <div className="panel">
              <p className="eyebrow">Net test balance</p>
              <p className="amount">{taka(charged + refundedTotal)}</p>
              <p className="small muted">
                {taka(charged)} charged · {taka(Math.abs(refundedTotal))} refunded
              </p>
            </div>

            <div className="panel">
              <h2>Recent checkout sessions</h2>
              <div style={{ overflowX: 'auto', marginTop: '0.8rem' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="muted">
                          No checkout sessions yet. Start one from the Pathshala web app.
                        </td>
                      </tr>
                    ) : null}
                    {sessions.map((session) => (
                      <tr key={String(session._id)}>
                        <td>
                          <span className="mono">{session.orderRef}</span>
                          <br />
                          <span className="small muted">{session.description}</span>
                        </td>
                        <td>{taka(session.amountPaisa)}</td>
                        <td>
                          <span className={`badge ${session.status === 'refunded' ? 'refund' : session.status === 'pending' ? 'warn' : ''}`}>
                            {session.status}
                          </span>
                        </td>
                        <td className="small muted">{session.createdAt.toLocaleDateString('en-GB')}</td>
                        <td>
                          {session.status === 'paid' ? (
                            <form action={refundAction}>
                              <input type="hidden" name="sessionId" value={String(session._id)} />
                              <button className="button secondary small" type="submit">
                                Refund
                              </button>
                            </form>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="panel">
              <h2>Webhook deliveries</h2>
              <div style={{ overflowX: 'auto', marginTop: '0.8rem' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Status</th>
                      <th>Attempts</th>
                      <th>Error</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {deliveries.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="muted">
                          No deliveries yet.
                        </td>
                      </tr>
                    ) : null}
                    {deliveries.map((delivery) => (
                      <tr key={String(delivery._id)}>
                        <td>
                          <span className="mono">{delivery.event}</span>
                        </td>
                        <td>
                          <span className={`badge ${delivery.status === 'failed' ? 'refund' : ''}`}>{delivery.status}</span>
                        </td>
                        <td>{delivery.attempts}</td>
                        <td className="small muted">{delivery.lastError ?? '—'}</td>
                        <td>
                          {delivery.status === 'failed' ? (
                            <form action={resendAction}>
                              <input type="hidden" name="deliveryId" value={String(delivery._id)} />
                              <button className="button secondary small" type="submit">
                                Retry
                              </button>
                            </form>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <aside className="stack">
            <section className="panel stack">
              <p className="eyebrow">API key</p>
              <p className="mono">{merchant.apiKeyPrefix}…</p>
              <p className="small muted">
                Keys are stored as SHA-256 hashes. Rotating replaces the current key immediately; the new key is shown once.
              </p>
              <form action={rotateKeyAction}>
                <button className="button secondary" type="submit">
                  Rotate API key
                </button>
              </form>
            </section>
            <section className="panel stack">
              <p className="eyebrow">Signed webhooks</p>
              <p className="small">
                Each request carries <span className="mono">x-paybridge-timestamp</span> and a{' '}
                <span className="mono">v1</span> HMAC over <span className="mono">timestamp.body</span>.
              </p>
              <p className="small muted">Receivers should reject timestamps older than five minutes and dedupe by event id.</p>
            </section>
            <section className="panel stack">
              <p className="eyebrow">Ledger</p>
              <p className="small muted">Latest entries</p>
              {ledger.slice(0, 5).map((entry) => (
                <p key={String(entry._id)} className="small">
                  {entry.type === 'refund' ? 'Refund' : 'Charge'} · {taka(Math.abs(entry.amountPaisa))}
                </p>
              ))}
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireMerchant } from '@/lib/auth';
import { KeyReveal, connectGateway, type KeyRevealRecord } from '@/lib/models';
import { forgetKeyAction } from './actions';

type KeyPageProps = { params: Promise<{ id: string }> };

/** Show the new API key once; it is deleted when the merchant confirms it is saved. */
export default async function KeyPage({ params }: KeyPageProps) {
  const { id } = await params;
  const merchant = await requireMerchant();
  await connectGateway();
  const reveal = (await KeyReveal.findOne({ _id: id, merchant: merchant._id }).lean()) as unknown as KeyRevealRecord | null;
  if (!reveal) redirect('/dashboard');

  return (
    <main>
      <div className="container" style={{ maxWidth: 620 }}>
        <p className="eyebrow">New API key</p>
        <h1 style={{ marginTop: '0.5rem' }}>Copy it now</h1>
        <p className="muted" style={{ marginTop: '0.6rem' }}>
          This is the only time the full key is shown. Store it in the merchant&apos;s environment, not in git.
        </p>
        <p className="panel mono" style={{ marginTop: '1.2rem', wordBreak: 'break-all' }}>{reveal.apiKey}</p>
        <form action={forgetKeyAction} style={{ marginTop: '1rem' }}>
          <input type="hidden" name="revealId" value={String(reveal._id)} />
          <button className="button" type="submit">I saved it</button>
        </form>
        <p style={{ marginTop: '1rem' }}>
          <Link href="/dashboard">Back to dashboard</Link>
        </p>
      </div>
    </main>
  );
}

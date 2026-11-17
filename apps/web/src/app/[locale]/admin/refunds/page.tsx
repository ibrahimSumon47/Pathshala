import { listRefundRequests } from '@pathshala/db';
import { formatPaisa, type Locale } from '@pathshala/shared';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { requireRole } from '@/lib/auth/guard';
import { decideRefundAction } from '../actions';
import styles from '../admin.module.css';

type RefundsPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
};

const COPY = {
  bn: {
    back: '← অ্যাডমিন',
    title: 'রিফান্ড অনুরোধ',
    lede: 'শিক্ষার্থীদের অনুরোধ পর্যালোচনা করুন। অনুমোদন দিলে অর্ডারটি ফেরত হবে এবং কোর্সে প্রবেশ বন্ধ হবে।',
    empty: 'কোনো রিফান্ড অনুরোধ নেই।',
    order: 'অর্ডার',
    buyer: 'ক্রেতা',
    course: 'কোর্স',
    amount: 'পরিমাণ',
    reason: 'কারণ',
    status: 'অবস্থা',
    when: 'সময়',
    decide: 'সিদ্ধান্ত',
    approve: 'অনুমোদন',
    decline: 'প্রত্যাখ্যান',
    saved: 'সিদ্ধান্ত সংরক্ষিত হয়েছে।',
  },
  en: {
    back: '← Admin',
    title: 'Refund requests',
    lede: 'Review learner requests. Approving reverses the order and closes access to its courses.',
    empty: 'No refund requests yet.',
    order: 'Order',
    buyer: 'Buyer',
    course: 'Course',
    amount: 'Amount',
    reason: 'Reason',
    status: 'Status',
    when: 'When',
    decide: 'Decision',
    approve: 'Approve',
    decline: 'Decline',
    saved: 'Decision saved.',
  },
} as const;

/** Operator queue for learner refunds; nothing is refunded until a decision is made. */
export default async function AdminRefundsPage({ params, searchParams }: RefundsPageProps) {
  const { locale } = await params;
  const { error, saved } = await searchParams;
  const language = (locale === 'en' ? 'en' : 'bn') as Locale;
  const copy = COPY[language];
  await requireRole('admin');
  const requests = await listRefundRequests();

  return (
    <div className={styles.page}>
      <div className="container">
        <Link href="/admin" className={styles.back}>
          {copy.back}
        </Link>
        <h1 className={styles.title}>{copy.title}</h1>
        <p className={styles.lede}>{copy.lede}</p>
        {error ? <Alert tone="error">{error}</Alert> : null}
        {saved ? <Alert tone="success">{copy.saved}</Alert> : null}

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">{copy.order}</th>
                <th scope="col">{copy.buyer}</th>
                <th scope="col">{copy.course}</th>
                <th scope="col">{copy.amount}</th>
                <th scope="col">{copy.reason}</th>
                <th scope="col">{copy.status}</th>
                <th scope="col">{copy.when}</th>
                <th scope="col">{copy.decide}</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td className={styles.email}>{request.orderNumber}</td>
                  <td>
                    {request.buyerName}
                    <br />
                    <span className={styles.email}>{request.buyerEmail}</span>
                  </td>
                  <td>{request.courseTitle[language] ?? request.courseTitle.en ?? request.courseTitle.bn ?? ''}</td>
                  <td className={styles.num}>{formatPaisa(request.totalPaisa, language)}</td>
                  <td>{request.reason}</td>
                  <td>
                    <Badge tone={request.status === 'approved' ? 'success' : request.status === 'declined' ? 'warning' : 'neutral'}>
                      {request.status}
                    </Badge>
                  </td>
                  <td>{new Date(request.createdAt).toLocaleDateString(locale)}</td>
                  <td>
                    {request.status === 'pending' ? (
                      <div className={styles.actions}>
                        <form action={decideRefundAction}>
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="requestId" value={request.id} />
                          <input type="hidden" name="approve" value="true" />
                          <button type="submit" className={buttonStyles({ variant: 'primary', size: 'sm' })}>
                            {copy.approve}
                          </button>
                        </form>
                        <form action={decideRefundAction}>
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="requestId" value={request.id} />
                          <input type="hidden" name="approve" value="false" />
                          <button type="submit" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
                            {copy.decline}
                          </button>
                        </form>
                      </div>
                    ) : (
                      <span className={styles.email}>{request.decidedAt ? new Date(request.decidedAt).toLocaleDateString(locale) : ''}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {requests.length === 0 ? <p className={styles.empty}>{copy.empty}</p> : null}
        </div>
      </div>
    </div>
  );
}

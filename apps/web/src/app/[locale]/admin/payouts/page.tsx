import { listPayoutStatements } from '@pathshala/db';
import { formatPaisa, type Locale } from '@pathshala/shared';
import { Alert } from '@/components/ui/alert';
import { buttonStyles } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { requireRole } from '@/lib/auth/guard';
import { setStatementPaidAction } from '../actions';
import styles from '../admin.module.css';

type AdminPayoutsProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
};

const COPY = {
  bn: {
    back: '← অ্যাডমিন',
    title: 'শিক্ষক পরিশোধ',
    lede: 'প্রতিটি শিক্ষকের মাসিক বিবরণ এখানে। টাকা পাঠানোর পর সেই মাসটি পরিশোধিত হিসেবে চিহ্নিত করুন।',
    teacher: 'শিক্ষক',
    month: 'মাস',
    sales: 'বিক্রয়',
    refunds: 'রিফান্ড',
    net: 'প্রাপ্য',
    status: 'অবস্থা',
    paid: 'পরিশোধিত',
    open: 'বাকি',
    mark: 'পরিশোধিত করুন',
    reopen: 'আবার খুলুন',
    empty: 'এখনো কোনো শিক্ষকের আয় নেই।',
    saved: 'পরিশোধের অবস্থা সংরক্ষিত হয়েছে।',
    note: 'এটি শুধু হিসাবের দাগ; কোনো টাকা স্বয়ংক্রিয়ভাবে পাঠানো হয় না।',
  },
  en: {
    back: '← Admin',
    title: 'Teacher payouts',
    lede: 'Every teacher’s monthly statement. Mark a month settled after the transfer; reopen it if it did not happen.',
    teacher: 'Teacher',
    month: 'Month',
    sales: 'Sales',
    refunds: 'Refunds',
    net: 'Payable',
    status: 'Status',
    paid: 'Paid',
    open: 'Open',
    mark: 'Mark paid',
    reopen: 'Reopen',
    empty: 'No teacher earnings yet.',
    saved: 'Payout state saved.',
    note: 'This records the settlement only; no money is transferred automatically.',
  },
} as const;

/** Operator view of statements across instructors, with a manual settlement marker. */
export default async function AdminPayoutsPage({ params, searchParams }: AdminPayoutsProps) {
  const { locale } = await params;
  const { error, saved } = await searchParams;
  const language = (locale === 'en' ? 'en' : 'bn') as Locale;
  const copy = COPY[language];
  await requireRole('admin');
  const rows = await listPayoutStatements();

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
        <p className={styles.email}>{copy.note}</p>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">{copy.teacher}</th>
                <th scope="col">{copy.month}</th>
                <th scope="col">{copy.sales}</th>
                <th scope="col">{copy.refunds}</th>
                <th scope="col">{copy.net}</th>
                <th scope="col">{copy.status}</th>
                <th scope="col">{copy.mark}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.instructorId}-${row.month}`}>
                  <td>{row.instructorName}</td>
                  <td>{row.month}</td>
                  <td>{formatPaisa(row.salesPaisa, language)}</td>
                  <td>{formatPaisa(row.refundsPaisa, language)}</td>
                  <td>{formatPaisa(row.netPaisa, language)}</td>
                  <td>{row.paidAt ? `${copy.paid} · ${new Date(row.paidAt).toLocaleDateString(locale)}` : copy.open}</td>
                  <td>
                    <form action={setStatementPaidAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="instructorId" value={row.instructorId} />
                      <input type="hidden" name="month" value={row.month} />
                      <input type="hidden" name="amountPaisa" value={Math.max(0, row.netPaisa)} />
                      <input type="hidden" name="paid" value={row.paidAt ? 'false' : 'true'} />
                      <button type="submit" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
                        {row.paidAt ? copy.reopen : copy.mark}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 ? <p className={styles.empty}>{copy.empty}</p> : null}
      </div>
    </div>
  );
}

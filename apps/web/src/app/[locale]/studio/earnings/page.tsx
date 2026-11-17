import { getInstructorEarnings, getInstructorStatements } from '@pathshala/db';
import { formatPaisa, type Locale } from '@pathshala/shared';
import { Link } from '@/i18n/navigation';
import { requireRole } from '@/lib/auth/guard';
import styles from '../studio.module.css';

type EarningsPageProps = { params: Promise<{ locale: string }> };

const COPY = {
  bn: {
    back: '← স্টুডিওতে ফিরুন',
    title: 'আয়ের বিবরণ',
    lede: 'প্রতিটি মাসের বিক্রি, রিফান্ড আর নিট আয়। হিসাব আসে লেজার থেকে, তাই রিফান্ড হলে নিজে থেকেই বিয়োগ হয়।',
    total: 'সর্বমোট আয়',
    sales: 'বিক্রি',
    export: 'সিএসভি ডাউনলোড',
    month: 'মাস',
    sold: 'বিক্রি',
    refunds: 'রিফান্ড',
    net: 'নিট',
    status: 'অবস্থা',
    paid: 'পরিশোধিত',
    open: 'বাকি',
    empty: 'এখনো কোনো বিক্রি নেই। প্রথম বিক্রি হলে এখানে মাসভিত্তিক হিসাব দেখা যাবে।',
    note: 'আপনি প্রতি বিক্রির ৮০% পান; ২০% পাঠশালার।',
  },
  en: {
    back: '← Back to the studio',
    title: 'Payout statements',
    lede: 'Sales, refunds and net earnings for each month. The numbers come from the ledger, so a refund subtracts itself.',
    total: 'Earned so far',
    sales: 'Sales',
    export: 'Download CSV',
    month: 'Month',
    sold: 'Sales',
    refunds: 'Refunds',
    net: 'Net',
    status: 'Status',
    paid: 'Paid',
    open: 'Open',
    empty: 'No sales yet. The first one will start the monthly record here.',
    note: 'You keep 80% of every sale; Pathshala keeps 20%.',
  },
} as const;

/** Monthly payouts for the signed-in teacher, with a formula-safe CSV of the same rows. */
export default async function EarningsPage({ params }: EarningsPageProps) {
  const { locale } = await params;
  const language = (locale === 'en' ? 'en' : 'bn') as Locale;
  const copy = COPY[language];
  const user = await requireRole('instructor', 'admin');
  const [statements, earnings] = await Promise.all([getInstructorStatements(user.id), getInstructorEarnings(user.id)]);
  const refunds = statements.reduce((total, row) => total + row.refundsPaisa, 0);

  return (
    <div className={styles.page}>
      <div className="container">
        <Link href="/studio" className={styles.back}>
          {copy.back}
        </Link>
        <p className={styles.eyebrow}>{copy.note}</p>
        <h1 className={styles.title}>{copy.title}</h1>
        <p className={styles.lede}>{copy.lede}</p>

        <section className={styles.statGrid}>
          <div className={styles.stat}>
            <p className={styles.statLabel}>{copy.total}</p>
            <p className={styles.statValue}>{formatPaisa(earnings.totalPaisa, language)}</p>
          </div>
          <div className={styles.stat}>
            <p className={styles.statLabel}>{copy.sales}</p>
            <p className={styles.statValue}>{earnings.sales}</p>
          </div>
          <div className={styles.stat}>
            <p className={styles.statLabel}>{copy.refunds}</p>
            <p className={styles.statValue}>{formatPaisa(refunds, language)}</p>
          </div>
        </section>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">{copy.month}</th>
                <th scope="col">{copy.sold}</th>
                <th scope="col">{copy.sales}</th>
                <th scope="col">{copy.refunds}</th>
                <th scope="col">{copy.net}</th>
                <th scope="col">{copy.status}</th>
              </tr>
            </thead>
            <tbody>
              {statements.map((row) => (
                <tr key={row.month}>
                  <td>{row.month}</td>
                  <td className={styles.num}>{row.sales}</td>
                  <td className={styles.num}>{formatPaisa(row.salesPaisa, language)}</td>
                  <td className={styles.num}>{formatPaisa(row.refundsPaisa, language)}</td>
                  <td className={styles.num}>{formatPaisa(row.netPaisa, language)}</td>
                  <td>{row.paidAt ? `${copy.paid} · ${new Date(row.paidAt).toLocaleDateString(locale)}` : copy.open}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {statements.length === 0 ? <p className={styles.empty}>{copy.empty}</p> : null}
        </div>

        {statements.length > 0 ? (
          <p>
            <a href="/api/studio/earnings" className={styles.editLink}>
              {copy.export}
            </a>
          </p>
        ) : null}
      </div>
    </div>
  );
}

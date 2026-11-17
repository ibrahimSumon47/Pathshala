import { getCouponRedemptionTimeline, getCouponReport } from '@pathshala/db';
import { formatPaisa, type Locale } from '@pathshala/shared';
import { Badge } from '@/components/ui/badge';
import { Link } from '@/i18n/navigation';
import { requireRole } from '@/lib/auth/guard';
import styles from '../admin.module.css';

type CouponsProps = { params: Promise<{ locale: string }> };

const COPY = {
  bn: {
    back: '← অ্যাডমিন',
    title: 'কুপন ও ক্যাম্পেইন',
    lede: 'কোন কোড কতবার ব্যবহার হয়েছে, কত ছাড় দিয়েছে আর কত আয় এনেছে—একসাথে।',
    empty: 'এখনো কোনো কুপন তৈরি হয়নি।',
    code: 'কোড',
    offer: 'ছাড়',
    used: 'ব্যবহার',
    cost: 'ছাড়ের টাকা',
    revenue: 'আয়',
    status: 'অবস্থা',
    active: 'চালু',
    inactive: 'বন্ধ',
    expired: 'মেয়াদ শেষ',
    timeline: 'ব্যবহারের ধারা',
    timelineLede: 'কোন কোড কবে, কার অর্ডারে, কত ছাড়ে ব্যবহার হয়েছে।',
    timelineEmpty: 'এখনো কোনো পরিশোধিত অর্ডারে কুপন ব্যবহার হয়নি।',
    when: 'সময়',
    order: 'অর্ডার',
    buyer: 'ক্রেতা',
    course: 'কোর্স',
    discount: 'ছাড়',
    paid: 'পরিশোধিত',
  },
  en: {
    back: '← Admin',
    title: 'Coupons and campaigns',
    lede: 'How often each code was used, what it cost in discounts, and what it brought in.',
    empty: 'No coupons have been created yet.',
    code: 'Code',
    offer: 'Offer',
    used: 'Used',
    cost: 'Discount cost',
    revenue: 'Revenue',
    status: 'Status',
    active: 'Active',
    inactive: 'Inactive',
    expired: 'Expired',
    timeline: 'Redemption timeline',
    timelineLede: 'When each code was used, by whom, and how much it took off the order.',
    timelineEmpty: 'No paid order has used a coupon yet.',
    when: 'When',
    order: 'Order',
    buyer: 'Buyer',
    course: 'Course',
    discount: 'Discount',
    paid: 'Paid',
  },
} as const;

/** Coupon cost and revenue side by side so a campaign can be judged, not guessed. */
export default async function AdminCouponsPage({ params }: CouponsProps) {
  const { locale } = await params;
  const language = (locale === 'en' ? 'en' : 'bn') as Locale;
  const copy = COPY[language];
  await requireRole('admin');
  const [coupons, timeline] = await Promise.all([getCouponReport(), getCouponRedemptionTimeline()]);

  return (
    <div className={styles.page}>
      <div className="container">
        <Link href="/admin" className={styles.back}>
          {copy.back}
        </Link>
        <h1 className={styles.title}>{copy.title}</h1>
        <p className={styles.lede}>{copy.lede}</p>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">{copy.code}</th>
                <th scope="col">{copy.offer}</th>
                <th scope="col">{copy.used}</th>
                <th scope="col">{copy.cost}</th>
                <th scope="col">{copy.revenue}</th>
                <th scope="col">{copy.status}</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => (
                <tr key={coupon.code}>
                  <td>{coupon.code}</td>
                  <td>{coupon.type === 'percent' ? `${coupon.value}%` : formatPaisa(coupon.value, language)}</td>
                  <td className={styles.num}>
                    {coupon.used}/{coupon.maxRedemptions}
                  </td>
                  <td className={styles.num}>{formatPaisa(coupon.discountPaisa, language)}</td>
                  <td className={styles.num}>{formatPaisa(coupon.revenuePaisa, language)}</td>
                  <td>
                    <Badge tone={coupon.expired ? 'warning' : coupon.active ? 'success' : 'neutral'}>
                      {coupon.expired ? copy.expired : coupon.active ? copy.active : copy.inactive}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {coupons.length === 0 ? <p className={styles.empty}>{copy.empty}</p> : null}
        </div>

        <section className={styles.section} aria-labelledby="coupon-timeline">
          <h2 id="coupon-timeline" className={styles.sectionTitle}>
            {copy.timeline}
          </h2>
          <p className={styles.lede}>{copy.timelineLede}</p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">{copy.when}</th>
                  <th scope="col">{copy.code}</th>
                  <th scope="col">{copy.order}</th>
                  <th scope="col">{copy.buyer}</th>
                  <th scope="col">{copy.course}</th>
                  <th scope="col">{copy.discount}</th>
                  <th scope="col">{copy.paid}</th>
                </tr>
              </thead>
              <tbody>
                {timeline.map((row) => (
                  <tr key={row.orderNumber}>
                    <td>{new Date(row.paidAt).toLocaleDateString(locale)}</td>
                    <td>{row.code}</td>
                    <td className={styles.email}>{row.orderNumber}</td>
                    <td>
                      {row.buyerName}
                      <br />
                      <span className={styles.email}>{row.buyerEmail}</span>
                    </td>
                    <td>{row.courseTitle[language] ?? row.courseTitle.en ?? row.courseTitle.bn ?? ''}</td>
                    <td className={styles.num}>{formatPaisa(row.discountPaisa, language)}</td>
                    <td className={styles.num}>{formatPaisa(row.totalPaisa, language)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {timeline.length === 0 ? <p className={styles.empty}>{copy.timelineEmpty}</p> : null}
          </div>
        </section>
      </div>
    </div>
  );
}

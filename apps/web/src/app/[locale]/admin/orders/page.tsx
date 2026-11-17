import { listAdminOrders } from '@pathshala/db';
import { formatPaisa, type Locale } from '@pathshala/shared';
import { Badge } from '@/components/ui/badge';
import { Link } from '@/i18n/navigation';
import { requireRole } from '@/lib/auth/guard';
import styles from '../admin.module.css';

type AdminOrdersProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
};

const COPY = {
  bn: {
    back: '← অ্যাডমিন',
    title: 'অর্ডার',
    lede: 'প্রতিটি অর্ডারের প্ল্যাটফর্ম অংশ এখানে দেখা যায়। অর্ডার নম্বর, নাম বা ইমেইল দিয়ে খুঁজুন।',
    search: 'খুঁজুন',
    placeholder: 'PS-… বা ইমেইল',
    empty: 'কোনো অর্ডার পাওয়া যায়নি।',
    order: 'অর্ডার',
    buyer: 'ক্রেতা',
    course: 'কোর্স',
    total: 'মোট',
    fee: 'প্ল্যাটফর্ম',
    status: 'অবস্থা',
    when: 'সময়',
  },
  en: {
    back: '← Admin',
    title: 'Orders',
    lede: 'The platform share of every order is shown here. Search by order number, buyer name or email.',
    search: 'Search',
    placeholder: 'PS-… or email',
    empty: 'No orders matched.',
    order: 'Order',
    buyer: 'Buyer',
    course: 'Course',
    total: 'Total',
    fee: 'Platform',
    status: 'Status',
    when: 'When',
  },
} as const;

/** Admin order explorer: per-order money, searchable by the fields support actually has. */
export default async function AdminOrdersPage({ params, searchParams }: AdminOrdersProps) {
  const { locale } = await params;
  const { q = '' } = await searchParams;
  const language = (locale === 'en' ? 'en' : 'bn') as Locale;
  const copy = COPY[language];
  await requireRole('admin');
  const orders = await listAdminOrders(q);

  return (
    <div className={styles.page}>
      <div className="container">
        <Link href="/admin" className={styles.back}>
          {copy.back}
        </Link>
        <h1 className={styles.title}>{copy.title}</h1>
        <p className={styles.lede}>{copy.lede}</p>

        <form className={styles.search} role="search">
          <label className={styles.srOnly} htmlFor="order-query">
            {copy.search}
          </label>
          <input id="order-query" name="q" type="search" defaultValue={q} placeholder={copy.placeholder} maxLength={80} />
          <button type="submit">{copy.search}</button>
        </form>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">{copy.order}</th>
                <th scope="col">{copy.buyer}</th>
                <th scope="col">{copy.course}</th>
                <th scope="col">{copy.total}</th>
                <th scope="col">{copy.fee}</th>
                <th scope="col">{copy.status}</th>
                <th scope="col">{copy.when}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className={styles.email}>{order.orderNumber}</td>
                  <td>
                    {order.buyerName}
                    <br />
                    <span className={styles.email}>{order.buyerEmail}</span>
                  </td>
                  <td>{order.courseTitle[language] ?? order.courseTitle.en ?? order.courseTitle.bn ?? ''}</td>
                  <td className={styles.num}>{formatPaisa(order.totalPaisa, language)}</td>
                  <td className={styles.num}>{formatPaisa(order.platformFeePaisa, language)}</td>
                  <td>
                    <Badge tone={order.status === 'paid' ? 'success' : order.status === 'refunded' ? 'warning' : 'neutral'}>
                      {order.status}
                    </Badge>
                  </td>
                  <td>{new Date(order.createdAt).toLocaleDateString(locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 ? <p className={styles.empty}>{copy.empty}</p> : null}
        </div>
      </div>
    </div>
  );
}

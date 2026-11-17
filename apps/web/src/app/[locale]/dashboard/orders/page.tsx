import { getStudentOrders } from '@pathshala/db';
import { formatPaisa, type Locale } from '@pathshala/shared';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Link } from '@/i18n/navigation';
import { requireUser } from '@/lib/auth/guard';
import styles from './orders.module.css';

type OrdersProps = { params: Promise<{ locale: string }> };

/** Receipts for every checkout attempt, including pending and refunded orders. */
export default async function OrdersPage({ params }: OrdersProps) {
  const { locale } = await params;
  const language = (locale === 'en' ? 'en' : 'bn') as Locale;
  const user = await requireUser();
  const orders = await getStudentOrders(user.id);

  return (
    <div className={styles.page}>
      <div className="container">
        <p className={styles.eyebrow}>{language === 'en' ? 'Your account' : 'আপনার অ্যাকাউন্ট'}</p>
        <h1>{language === 'en' ? 'Orders and receipts' : 'অর্ডার ও রসিদ'}</h1>
        <p className={styles.lede}>
          {language === 'en'
            ? 'Payments are in test mode. A receipt appears only after a signed webhook confirms the payment.'
            : 'পেমেন্ট পরীক্ষা মোডে। সাইন করা ওয়েবহুক নিশ্চিত করার পরেই রসিদ তৈরি হয়।'}
        </p>
        <div className={styles.test} role="status">
          {language === 'en' ? 'Test mode — no real money was charged.' : 'পরীক্ষা মোড — আসল টাকা কাটা হয়নি।'}
        </div>

        {orders.length === 0 ? (
          <EmptyState
            title={language === 'en' ? 'No orders yet' : 'এখনো কোনো অর্ডার নেই'}
            body={language === 'en' ? 'Paid courses will show their receipts here.' : 'পরিশোধিত কোর্সের রসিদ এখানে দেখা যাবে।'}
          />
        ) : (
          <ul className={styles.list}>
            {orders.map((order) => (
              <li key={order.id}>
                <Card className={styles.order}>
                  <div>
                    <p className={styles.title}>
                      {order.items.length > 1
                        ? `${order.items.length} ${language === 'en' ? 'courses' : 'টি কোর্স'}`
                        : order.courseTitle[language] || order.courseTitle.en || order.courseSlug}
                    </p>
                    {order.items.length > 1 ? (
                      <ul className={styles.items}>
                        {order.items.map((item) => (
                          <li key={item.courseId}>{item.title[language] ?? item.title.en ?? item.slug}</li>
                        ))}
                      </ul>
                    ) : null}
                    <p className={styles.meta}>
                      {order.orderNumber} · {new Date(order.createdAt).toLocaleDateString(locale)}
                    </p>
                  </div>
                  <div className={styles.right}>
                    <Badge tone={order.status === 'paid' ? 'success' : 'warning'}>{order.status}</Badge>
                    <strong>{formatPaisa(order.totalPaisa, language)}</strong>
                  </div>
                  <div className={styles.footer}>
                    {order.receiptNumber ? (
                      <span>
                        {language === 'en' ? 'Receipt' : 'রসিদ'}: <strong>{order.receiptNumber}</strong>
                      </span>
                    ) : (
                      <span>
                        {language === 'en' ? 'Awaiting signed confirmation.' : 'সাইন করা নিশ্চিতকরণের অপেক্ষায়।'}
                      </span>
                    )}
                    <span className={styles.links}>
                      <Link href={`/checkout/${order.orderNumber}`}>
                        {language === 'en' ? 'Open order' : 'অর্ডার দেখুন'}
                      </Link>
                      {order.status === 'paid' || order.status === 'refunded' ? (
                        <a href={`/api/orders/${order.orderNumber}/invoice`}>
                          {language === 'en' ? 'Invoice (PDF)' : 'ইনভয়েস (PDF)'}
                        </a>
                      ) : null}
                    </span>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
        <p className={styles.back}>
          <Link href="/dashboard">{language === 'en' ? '← Back to dashboard' : '← ড্যাশবোর্ডে ফিরুন'}</Link>
        </p>
      </div>
    </div>
  );
}

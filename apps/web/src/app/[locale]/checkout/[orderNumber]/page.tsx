import { getOrderForUser } from '@pathshala/db';
import { formatPaisa, type Locale } from '@pathshala/shared';
import { notFound } from 'next/navigation';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button, buttonStyles } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Link } from '@/i18n/navigation';
import { requireUser } from '@/lib/auth/guard';
import { applyCouponAction, payWithPayBridgeAction, payWithStripeAction, removeCouponAction } from './actions';
import styles from './checkout.module.css';

type CheckoutProps = {
  params: Promise<{ locale: string; orderNumber: string }>;
  searchParams: Promise<{ error?: string; coupon?: string; paid?: string; cancelled?: string }>;
};

const COPY = {
  bn: {
    back: 'কোর্সে ফিরুন',
    checkout: 'চেকআউট',
    testMode: 'পরীক্ষা মোড — কোনো আসল টাকা কাটা হবে না।',
    testBody: 'স্ট্রাইপ ও পেব্রিজ — দুটোই স্যান্ডবক্স। কার্ড চাওয়া হলে পরীক্ষার কার্ড ব্যবহার করুন।',
    summary: 'অর্ডার সারসংক্ষেপ',
    course: 'কোর্স',
    subtotal: 'মূল্য',
    discount: 'ছাড়',
    total: 'মোট',
    coupon: 'কুপন',
    couponPlaceholder: 'যেমন EARLYBIRD',
    apply: 'কুপন লাগান',
    remove: 'কুপন সরান',
    couponApplied: 'কুপন লাগানো হয়েছে।',
    payStripe: 'স্ট্রাইপ দিয়ে পরীক্ষা করুন',
    payPayBridge: 'পেব্রিজ দিয়ে পরীক্ষা করুন',
    stripeMissing: 'স্ট্রাইপ টেস্ট কী নেই; পেব্রিজ ব্যবহার করুন।',
    paybridgeMissing: 'পেব্রিজ এখনো কনফিগার হয়নি।',
    paid: 'পেমেন্ট সম্পন্ন',
    refunded: 'ফেরত দেওয়া হয়েছে',
    pending: 'পেমেন্টের অপেক্ষায়',
    waiting: 'পেমেন্ট নিশ্চিত হচ্ছে। সাইন করা ওয়েবহুক এলে এই পাতা হালনাগাদ হবে।',
    receipt: 'রসিদ',
    receiptNumber: 'রসিদ নম্বর',
    orderNumber: 'অর্ডার নম্বর',
    paidAt: 'পরিশোধের সময়',
    start: 'শেখা শুরু করুন',
    dashboard: 'ড্যাশবোর্ডে যান',
    cancelled: 'পেমেন্ট বাতিল হয়েছে; কোনো টাকা কাটা হয়নি।',
    error: 'চেকআউট সম্পন্ন হয়নি',
    paidWith: 'মাধ্যম',
    secure: 'সাইন করা ওয়েবহুক ছাড়া কোনো অর্ডার সম্পন্ন হয় না।',
  },
  en: {
    back: 'Back to course',
    checkout: 'Checkout',
    testMode: 'Test mode — no real money is charged.',
    testBody: 'Stripe and PayBridge are both sandboxes. Use the demo card when a card form appears.',
    summary: 'Order summary',
    course: 'Course',
    subtotal: 'Price',
    discount: 'Discount',
    total: 'Total',
    coupon: 'Coupon',
    couponPlaceholder: 'e.g. EARLYBIRD',
    apply: 'Apply coupon',
    remove: 'Remove coupon',
    couponApplied: 'Coupon applied.',
    payStripe: 'Pay with Stripe (test)',
    payPayBridge: 'Pay with PayBridge (test)',
    stripeMissing: 'Stripe test keys are not set; use PayBridge.',
    paybridgeMissing: 'PayBridge is not configured yet.',
    paid: 'Payment complete',
    refunded: 'Refunded',
    pending: 'Awaiting payment',
    waiting: 'We are confirming the payment. This page refreshes after the signed webhook arrives.',
    receipt: 'Receipt',
    receiptNumber: 'Receipt number',
    orderNumber: 'Order number',
    paidAt: 'Paid at',
    start: 'Start learning',
    dashboard: 'Go to dashboard',
    cancelled: 'Payment cancelled; nothing was charged.',
    error: 'Checkout did not finish',
    paidWith: 'Via',
    secure: 'An order is never fulfilled without a signed webhook.',
  },
} as const;

/** Test-mode checkout: order summary, coupon and both payment rails. */
export default async function CheckoutPage({ params, searchParams }: CheckoutProps) {
  const { locale, orderNumber } = await params;
  const { error, coupon, paid, cancelled } = await searchParams;
  const language = (locale === 'en' ? 'en' : 'bn') as Locale;
  const copy = COPY[language];
  const user = await requireUser();
  const order = await getOrderForUser(orderNumber, user.id);
  if (!order) notFound();

  const title =
    order.items.length > 1
      ? `${order.items.length} ${language === 'en' ? 'courses' : 'টি কোর্স'}`
      : order.courseTitle[language] || order.courseTitle.en || order.courseTitle.bn || order.courseSlug;
  const stripeReady = Boolean(process.env.STRIPE_SECRET_KEY);
  const paybridgeReady = Boolean(process.env.PAYBRIDGE_BASE_URL && process.env.PAYBRIDGE_API_KEY);

  return (
    <div className={styles.page}>
      <div className="container">
        <Link href={`/courses/${order.courseSlug}`} className={styles.back}>
          ← {copy.back}
        </Link>
        <div className={styles.head}>
          <div>
            <p className={styles.eyebrow}>{copy.checkout}</p>
            <h1>{title}</h1>
          </div>
          <Badge tone={order.status === 'paid' ? 'success' : 'warning'}>
            {order.status === 'paid' ? copy.paid : order.status === 'refunded' ? copy.refunded : copy.pending}
          </Badge>
        </div>

        <div className={styles.test} role="status">
          <strong>{copy.testMode}</strong>
          <span>{copy.testBody}</span>
        </div>
        {error ? <Alert tone="error">{copy.error}: {error}</Alert> : null}
        {cancelled ? <Alert tone="info">{copy.cancelled}</Alert> : null}
        {coupon ? <Alert tone="success">{copy.couponApplied}</Alert> : null}

        <div className={styles.grid}>
          <Card className={styles.summary}>
            <h2>{copy.summary}</h2>
            <dl className={styles.rows}>
              <div>
                <dt>{copy.course}</dt>
                <dd>
                  {order.items.length > 1 ? (
                    <ul className={styles.itemList}>
                      {order.items.map((item) => (
                        <li key={item.courseId}>
                          {item.title[language] ?? item.title.en ?? item.slug} · {formatPaisa(item.pricePaisa, language)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    title
                  )}
                </dd>
              </div>
              <div>
                <dt>{copy.subtotal}</dt>
                <dd>{formatPaisa(order.amountPaisa, language)}</dd>
              </div>
              {order.discountPaisa > 0 ? (
                <div>
                  <dt>{copy.discount} ({order.couponCode})</dt>
                  <dd>−{formatPaisa(order.discountPaisa, language)}</dd>
                </div>
              ) : null}
              <div className={styles.total}>
                <dt>{copy.total}</dt>
                <dd>{formatPaisa(order.totalPaisa, language)}</dd>
              </div>
            </dl>
            {order.status === 'paid' || order.status === 'refunded' ? (
              <div className={styles.receipt}>
                <div>
                  <span>{copy.receiptNumber}</span>
                  <strong>{order.receiptNumber}</strong>
                </div>
                <div>
                  <span>{copy.orderNumber}</span>
                  <strong>{order.orderNumber}</strong>
                </div>
                <div>
                  <span>{copy.paidAt}</span>
                  <strong>{order.paidAt ? new Date(order.paidAt).toLocaleString(locale) : '—'}</strong>
                </div>
                <div>
                  <span>{copy.paidWith}</span>
                  <strong>{order.provider === 'paybridge' ? 'PayBridge (test)' : 'Stripe (test)'}</strong>
                </div>
              </div>
            ) : null}
            {order.status === 'paid' ? (
              <div className={styles.actions}>
                <Link href={`/learn/${order.items[0]?.slug ?? order.courseSlug}`} className={buttonStyles()}>
                  {copy.start}
                </Link>
                <Link href="/dashboard/orders" className={buttonStyles({ variant: 'secondary' })}>
                  {copy.dashboard}
                </Link>
              </div>
            ) : null}
          </Card>

          <div className={styles.side}>
            {order.status === 'pending' ? (
              <>
                <Card className={styles.panel}>
                  <h2>{copy.coupon}</h2>
                  {order.couponCode ? (
                    <form action={removeCouponAction} className={styles.inline}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="orderNumber" value={order.orderNumber} />
                      <p><strong>{order.couponCode}</strong></p>
                      <Button type="submit" variant="secondary" size="sm">{copy.remove}</Button>
                    </form>
                  ) : (
                    <form action={applyCouponAction} className={styles.couponForm}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="orderNumber" value={order.orderNumber} />
                      <Field id="code" name="code" label={copy.coupon} placeholder={copy.couponPlaceholder} maxLength={32} required />
                      <Button type="submit" variant="secondary">{copy.apply}</Button>
                    </form>
                  )}
                </Card>

                <Card className={styles.panel}>
                  <h2>{copy.summary}</h2>
                  <form action={payWithStripeAction} className={styles.payForm}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="orderNumber" value={order.orderNumber} />
                    <Button type="submit" disabled={!stripeReady}>{copy.payStripe}</Button>
                    {!stripeReady ? <p className={styles.hint}>{copy.stripeMissing}</p> : null}
                  </form>
                  <form action={payWithPayBridgeAction} className={styles.payForm}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="orderNumber" value={order.orderNumber} />
                    <Button type="submit" variant="secondary" disabled={!paybridgeReady}>{copy.payPayBridge}</Button>
                    {!paybridgeReady ? <p className={styles.hint}>{copy.paybridgeMissing}</p> : null}
                  </form>
                  <p className={styles.hint}>{copy.secure}</p>
                </Card>
              </>
            ) : null}

            {order.status === 'pending' && paid ? <Alert tone="info">{copy.waiting}</Alert> : null}

            <p className={styles.orderLine}>
              {copy.orderNumber}: <span>{order.orderNumber}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

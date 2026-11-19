import { getCartView } from '@pathshala/db';
import { formatPaisa, type Locale } from '@pathshala/shared';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Link } from '@/i18n/navigation';
import { plural } from '@/lib/plural';
import { requireUser } from '@/lib/auth/guard';
import {
  applyCartCouponAction,
  checkoutCartAction,
  clearCartCouponAction,
  removeFromCartAction,
} from './actions';
import styles from './cart.module.css';

type CartProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
};

const COPY = {
  bn: {
    eyebrow: 'আপনার ঝুড়ি',
    title: 'একসাথে কিনুন',
    lede: 'একাধিক কোর্স একসাথে কিনতে পারেন। কুপন থাকলে এখানেই লাগান, তারপর একবারেই পেমেন্ট করুন।',
    emptyTitle: 'ঝুড়ি এখন খালি',
    emptyBody: 'কোর্সের পেজে “ঝুড়িতে রাখুন” চাপলে কোর্সটি এখানে জমা হবে।',
    browse: 'কোর্স দেখুন',
    remove: 'সরান',
    coupon: 'কুপন',
    couponPlaceholder: 'যেমন EARLYBIRD',
    apply: 'লাগান',
    clearCoupon: 'কুপন সরান',
    subtotal: 'মোট দাম',
    discount: 'ছাড়',
    total: 'দিতে হবে',
    checkout: 'সবগুলো কিনুন',
    testNote: 'চেকআউট পরীক্ষা মোডে; আসল টাকা কাটা হবে না।',
    courses: 'কোর্স',
    course: 'কোর্স',
    couponProblem: 'কুপনটি লাগেনি:',
  },
  en: {
    eyebrow: 'Your cart',
    title: 'Buy several at once',
    lede: 'Put more than one course together. Apply a coupon here, then pay once.',
    emptyTitle: 'Your cart is empty',
    emptyBody: 'Use “Add to cart” on a course page and it will wait here.',
    browse: 'Browse courses',
    remove: 'Remove',
    coupon: 'Coupon',
    couponPlaceholder: 'e.g. EARLYBIRD',
    apply: 'Apply',
    clearCoupon: 'Remove coupon',
    subtotal: 'Subtotal',
    discount: 'Discount',
    total: 'Total',
    checkout: 'Buy all of these',
    testNote: 'Checkout runs in test mode; no real money is charged.',
    courses: 'courses',
    course: 'course',
    couponProblem: 'That coupon did not apply:',
  },
} as const;

/** The learner's cart: several courses, one coupon and a single payment. */
export default async function CartPage({ params, searchParams }: CartProps) {
  const { locale } = await params;
  const { saved, error } = await searchParams;
  const language = (locale === 'en' ? 'en' : 'bn') as Locale;
  const copy = COPY[language];
  const user = await requireUser();
  const cart = await getCartView(user.id);

  return (
    <div className={styles.page}>
      <div className="container">
        <p className={styles.eyebrow}>{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
        <p className={styles.lede}>{copy.lede}</p>
        {saved ? <Alert tone="success">{saved}</Alert> : null}
        {error ? <Alert tone="error">{error}</Alert> : null}
        {cart.couponError ? (
          <Alert tone="error">
            {copy.couponProblem} {cart.couponError}
          </Alert>
        ) : null}

        {cart.courses.length === 0 ? (
          <EmptyState
            title={copy.emptyTitle}
            body={copy.emptyBody}
            action={
              <Link href="/courses" className={styles.cta}>
                {copy.browse}
              </Link>
            }
          />
        ) : (
          <div className={styles.layout}>
            <ul className={styles.list}>
              {cart.courses.map((course) => (
                <li key={course.id}>
                  <Card className={styles.row}>
                    <div>
                      <Link href={`/courses/${course.slug}`} className={styles.title}>
                        {course.title[language] ?? course.title.en ?? course.slug}
                      </Link>
                      <p className={styles.meta}>
                        {course.level} · {course.language === 'bn' ? 'বাংলা' : 'English'}
                      </p>
                    </div>
                    <div className={styles.rowRight}>
                      <strong>{formatPaisa(course.pricePaisa, language)}</strong>
                      <form action={removeFromCartAction}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="courseId" value={course.id} />
                        <Button type="submit" variant="ghost" size="sm">
                          {copy.remove}
                        </Button>
                      </form>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>

            <Card className={styles.summary}>
              <h2>
                {cart.courses.length} {plural(cart.courses.length, copy.course, copy.courses)}
              </h2>
              {cart.couponCode ? (
                <form action={clearCartCouponAction} className={styles.couponRow}>
                  <input type="hidden" name="locale" value={locale} />
                  <p>
                    <strong>{cart.couponCode}</strong>
                  </p>
                  <Button type="submit" variant="secondary" size="sm">
                    {copy.clearCoupon}
                  </Button>
                </form>
              ) : (
                <form action={applyCartCouponAction} className={styles.couponForm}>
                  <input type="hidden" name="locale" value={locale} />
                  <Field id="cart-coupon" name="code" label={copy.coupon} placeholder={copy.couponPlaceholder} maxLength={32} />
                  <Button type="submit" variant="secondary" size="sm">
                    {copy.apply}
                  </Button>
                </form>
              )}
              <dl className={styles.totals}>
                <div>
                  <dt>{copy.subtotal}</dt>
                  <dd>{formatPaisa(cart.subtotalPaisa, language)}</dd>
                </div>
                {cart.discountPaisa > 0 ? (
                  <div>
                    <dt>{copy.discount}</dt>
                    <dd>−{formatPaisa(cart.discountPaisa, language)}</dd>
                  </div>
                ) : null}
                <div className={styles.total}>
                  <dt>{copy.total}</dt>
                  <dd>{formatPaisa(cart.totalPaisa, language)}</dd>
                </div>
              </dl>
              <form action={checkoutCartAction}>
                <input type="hidden" name="locale" value={locale} />
                <Button type="submit" className={styles.full}>
                  {copy.checkout}
                </Button>
              </form>
              <p className={styles.meta}>{copy.testNote}</p>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

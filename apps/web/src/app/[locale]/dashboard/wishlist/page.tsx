import { formatPaisa } from '@pathshala/shared';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Link } from '@/i18n/navigation';
import { requireUser } from '@/lib/auth/guard';
import { getDashboardLearning } from '@/lib/learning';
import { removeWishlistAction, wishlistToCartAction } from '../library-actions';
import styles from './wishlist.module.css';

type WishlistProps = { params: Promise<{ locale: string }> };

const COPY = {
  bn: {
    back: '← ড্যাশবোর্ডে ফিরুন',
    title: 'পরে দেখার তালিকা',
    lede: 'পছন্দ হয়েছে কিন্তু এখনো ভর্তি হননি—এই কোর্সগুলো এখানে থাকে।',
    empty: 'তালিকা এখন খালি',
    emptyBody: 'কোনো কোর্সের পেজে “পরে দেখার তালিকায় রাখুন” চাপলে সেটি এখানে আসবে।',
    browse: 'কোর্স দেখুন',
    free: 'ফ্রি',
    cart: 'ঝুড়িতে রাখুন',
    remove: 'সরান',
    open: 'কোর্স দেখুন',
  },
  en: {
    back: '← Back to dashboard',
    title: 'Saved for later',
    lede: 'Courses you liked but have not joined yet wait here.',
    empty: 'Nothing saved yet',
    emptyBody: 'Use “Save for later” on a course page and it will appear here.',
    browse: 'Browse courses',
    free: 'Free',
    cart: 'Add to cart',
    remove: 'Remove',
    open: 'View course',
  },
} as const;

/** The wishlist, with a direct route into the cart. */
export default async function WishlistPage({ params }: WishlistProps) {
  const { locale } = await params;
  const language = locale === 'en' ? 'en' : 'bn';
  const copy = COPY[language];
  const user = await requireUser();
  const learning = await getDashboardLearning(user.id);

  return (
    <div className={styles.page}>
      <div className="container">
        <Link href="/dashboard" className={styles.back}>
          {copy.back}
        </Link>
        <h1>{copy.title}</h1>
        <p className={styles.lede}>{copy.lede}</p>

        {learning.wishlist.length === 0 ? (
          <EmptyState
            title={copy.empty}
            body={copy.emptyBody}
            action={
              <Link href="/courses" className={styles.link}>
                {copy.browse}
              </Link>
            }
          />
        ) : (
          <ul className={styles.list}>
            {learning.wishlist.map((course) => (
              <li key={course.id}>
                <Card className={styles.row}>
                  <div>
                    <Link href={`/courses/${course.slug}`} className={styles.title}>
                      {course.title[language] ?? course.title.en ?? course.slug}
                    </Link>
                    <p className={styles.price}>
                      {course.pricePaisa === 0 ? copy.free : formatPaisa(course.pricePaisa, language)}
                    </p>
                  </div>
                  <div className={styles.actions}>
                    <Link href={`/courses/${course.slug}`} className={styles.open}>
                      {copy.open}
                    </Link>
                    {course.pricePaisa > 0 ? (
                      <form action={wishlistToCartAction}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="courseId" value={course.id} />
                        <Button type="submit" size="sm">
                          {copy.cart}
                        </Button>
                      </form>
                    ) : null}
                    <form action={removeWishlistAction}>
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
        )}
      </div>
    </div>
  );
}

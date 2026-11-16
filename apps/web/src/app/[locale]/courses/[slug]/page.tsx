import { getCourseBySlug, listCourseSessions } from '@pathshala/db';
import { formatPaisa, type Locale } from '@pathshala/shared';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button, buttonStyles } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import { getCourseReviews, getCourseViewerState } from '@/lib/learning';
import { startCheckoutAction } from '../../checkout/[orderNumber]/actions';
import { enrolAction, submitReviewAction, toggleWishlistAction } from '../../learn/[slug]/actions';
import styles from './course.module.css';

type CoursePageProps = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ error?: string }>;
};

const COPY = {
  bn: {
    by: 'শিক্ষক',
    curriculum: 'পাঠক্রম',
    lessons: 'পাঠ',
    outcomes: 'শেষে কী শিখবেন',
    requirements: 'যা লাগবে',
    enrol: 'ভর্তি হতে চাই',
    signIn: 'ভর্তি হতে লগ ইন করুন',
    free: 'ফ্রি',
    preview: 'প্রিভিউ',
    video: 'ভিডিও',
    quiz: 'কুইজ',
    reading: 'পাঠ',
    back: 'সব কোর্স',
    note: 'যে কোনো সময় শুরু করুন; কোর্সটি আপনার অ্যাকাউন্টে থাকবে।',
    noLessons: 'পাঠক্রম এখনো যোগ করা হয়নি।',
    continue: 'শেখা চালিয়ে যান',
    wishlist: 'পরে দেখার তালিকায় রাখুন',
    wishlisted: 'তালিকা থেকে সরান',
    reviews: 'শিক্ষার্থীদের মতামত',
    noReviews: 'এখনো কোনো মতামত নেই।',
    reviewTitle: 'আপনার মতামত',
    rating: 'রেটিং',
    reviewBody: 'কী ভালো লাগল, কী আরও ভালো হতে পারত',
    submitReview: 'মতামত সংরক্ষণ করুন',
    buy: 'কোর্সটি কিনুন',
    testNote: 'চেকআউট পরীক্ষা মোডে; আসল টাকা কাটা হবে না।',
    live: 'লাইভ ক্লাস',
    liveRoom: 'লাইভ রুমে যান',
  },
  en: {
    by: 'Teacher',
    curriculum: 'Curriculum',
    lessons: 'lessons',
    outcomes: 'What you will learn',
    requirements: 'What you need',
    enrol: 'Enrol in this course',
    signIn: 'Sign in to enrol',
    free: 'Free',
    preview: 'Preview',
    video: 'Video',
    quiz: 'Quiz',
    reading: 'Reading',
    back: 'All courses',
    note: 'Start any time; the course stays in your account.',
    noLessons: 'The curriculum is still being prepared.',
    continue: 'Continue learning',
    wishlist: 'Save for later',
    wishlisted: 'Remove from saved',
    reviews: 'Learner reviews',
    noReviews: 'No reviews yet.',
    reviewTitle: 'Your review',
    rating: 'Rating',
    reviewBody: 'What worked, and what could be better',
    submitReview: 'Save review',
    buy: 'Buy this course',
    testNote: 'Checkout runs in test mode; no real money is charged.',
    live: 'Live classes',
    liveRoom: 'Open the live room',
  },
} as const;

/** Public course page with teacher, curriculum and the enrolment entry point. */
export default async function CoursePage({ params, searchParams }: CoursePageProps) {
  const { locale, slug } = await params;
  const { error } = await searchParams;
  const language = (locale === 'en' ? 'en' : 'bn') as Locale;
  const copy = COPY[language];
  const course = await getCourseBySlug(slug);
  if (!course) notFound();

  const session = await auth();
  const viewer = session?.user?.id ? await getCourseViewerState(course.id, session.user.id) : null;
  const reviews = await getCourseReviews(course.id);
  const liveSessions = await listCourseSessions(course.id, 'upcoming');
  const lessonCount = course.sections.reduce((total, section) => total + section.lessons.length, 0);

  return (
    <div className={styles.page}>
      <div className="container">
        <Link href="/courses" className={styles.back}>
          ← {copy.back}
        </Link>
        {error ? <Alert tone="error">{error}</Alert> : null}
        <div className={styles.layout}>
          <div>
            <div className={styles.badges}>
              <Badge>{course.categoryName?.[language] ?? course.level}</Badge>
              <Badge tone="neutral">{course.language === 'bn' ? 'বাংলা' : 'English'}</Badge>
            </div>
            <h1 className={styles.title}>{course.title[language] || course.title.en || course.title.bn}</h1>
            <p className={styles.subtitle}>{course.subtitle?.[language] ?? ''}</p>
            <p className={styles.meta}>
              {copy.by} {course.instructorName} · ★ {course.ratingAverage.toFixed(1)} ({course.ratingCount}) ·{' '}
              {lessonCount} {copy.lessons}
            </p>
            <p className={styles.description}>{course.description?.[language] ?? ''}</p>

            {course.outcomes.length > 0 ? (
              <section className={styles.section}>
                <h2>{copy.outcomes}</h2>
                <ul className={styles.list}>
                  {course.outcomes.map((outcome) => (
                    <li key={outcome}>{outcome}</li>
                  ))}
                </ul>
              </section>
            ) : null}
            {course.requirements.length > 0 ? (
              <section className={styles.section}>
                <h2>{copy.requirements}</h2>
                <ul className={styles.list}>
                  {course.requirements.map((requirement) => (
                    <li key={requirement}>{requirement}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className={styles.section}>
              <h2>{copy.curriculum}</h2>
              {course.sections.length === 0 ? <p className={styles.meta}>{copy.noLessons}</p> : null}
              {course.sections.map((section) => (
                <div key={section.id} className={styles.sectionBlock}>
                  <h3>{section.title[language] || section.title.en || section.title.bn}</h3>
                  <ol className={styles.lessonList}>
                    {section.lessons.map((lesson) => (
                      <li key={lesson.id}>
                        <span>{lesson.title[language] || lesson.title.en || lesson.title.bn}</span>
                        <span className={styles.lessonMeta}>
                          {copy[lesson.type]}
                          {lesson.isPreview ? ` · ${copy.preview}` : ''}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </section>

            {liveSessions.length > 0 ? (
              <section className={styles.section}>
                <h2>{copy.live}</h2>
                <ul className={styles.reviewList}>
                  {liveSessions.map((session) => (
                    <li key={session.id} className={styles.review}>
                      <p className={styles.reviewHead}>
                        <strong>{session.title[language] || session.title.en || session.title.bn}</strong>
                      </p>
                      <p className={styles.meta}>
                        {new Date(session.startsAt).toLocaleString(locale)} · {session.durationMinutes} min
                      </p>
                    </li>
                  ))}
                </ul>
                <Link href={`/live/${course.slug}`} className={buttonStyles({ variant: 'secondary' })}>
                  {copy.liveRoom}
                </Link>
              </section>
            ) : null}

            <section id="reviews" className={styles.section}>
              <h2>{copy.reviews}</h2>
              {reviews.length === 0 ? <p className={styles.meta}>{copy.noReviews}</p> : null}
              <ul className={styles.reviewList}>
                {reviews.map((review) => (
                  <li key={review.id} className={styles.review}>
                    <p className={styles.reviewHead}>
                      <strong>{review.author}</strong> · ★ {review.rating}
                    </p>
                    {review.body ? <p>{review.body}</p> : null}
                  </li>
                ))}
              </ul>
              {viewer?.enrolled ? (
                <form action={submitReviewAction} className={styles.reviewForm}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="courseId" value={course.id} />
                  <input type="hidden" name="slug" value={course.slug} />
                  <label htmlFor="rating">{copy.rating}</label>
                  <select id="rating" name="rating" defaultValue="5">
                    {[5, 4, 3, 2, 1].map((value) => (
                      <option key={value} value={value}>
                        {'★'.repeat(value)}
                      </option>
                    ))}
                  </select>
                  <label htmlFor="review-body">{copy.reviewBody}</label>
                  <textarea id="review-body" name="body" rows={4} maxLength={1200} />
                  <Button type="submit" variant="secondary">
                    {copy.submitReview}
                  </Button>
                </form>
              ) : null}
            </section>
          </div>

          <Card className={styles.buyCard}>
            <p className={styles.price}>{course.pricePaisa === 0 ? copy.free : formatPaisa(course.pricePaisa, language)}</p>
            <p className={styles.meta}>
              {lessonCount} {copy.lessons}
            </p>
            {!session?.user ? (
              <Link href="/sign-in" className={buttonStyles()}>
                {copy.signIn}
              </Link>
            ) : viewer?.enrolled ? (
              <Link href={`/learn/${course.slug}`} className={buttonStyles()}>
                {copy.continue}
              </Link>
            ) : course.pricePaisa > 0 ? (
              <form action={startCheckoutAction}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="courseId" value={course.id} />
                <input type="hidden" name="slug" value={course.slug} />
                <Button type="submit" className={styles.fullButton}>
                  {copy.buy}
                </Button>
              </form>
            ) : (
              <form action={enrolAction}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="courseId" value={course.id} />
                <input type="hidden" name="slug" value={course.slug} />
                <Button type="submit" className={styles.fullButton}>
                  {copy.enrol}
                </Button>
              </form>
            )}
            {session?.user ? (
              <form action={toggleWishlistAction}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="courseId" value={course.id} />
                <input type="hidden" name="slug" value={course.slug} />
                <Button type="submit" variant="secondary" className={styles.fullButton}>
                  {viewer?.wishlisted ? copy.wishlisted : copy.wishlist}
                </Button>
              </form>
            ) : null}
            <p className={styles.note}>{course.pricePaisa > 0 ? copy.testNote : copy.note}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

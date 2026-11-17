import { getCourseBySlug, listCourseSessions } from '@pathshala/db';
import { formatPaisa, type Locale } from '@pathshala/shared';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button, buttonStyles } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
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
    audience: 'কাদের জন্য',
    about: 'কোর্সটি নিয়ে',
    faq: 'সাধারণ প্রশ্ন',
    enrol: 'ভর্তি হতে চাই',
    signIn: 'ভর্তি হতে লগ ইন করুন',
    free: 'ফ্রি',
    preview: 'প্রিভিউ',
    previewBody: 'এই পাঠটি বিনা মূল্যে পড়ে দেখুন।',
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
    level: 'স্তর',
    levels: { beginner: 'শুরু', intermediate: 'মাঝারি', advanced: 'উন্নত' },
    language: 'ভাষা',
    updated: 'সর্বশেষ হালনাগাদ',
    certificate: 'সার্টিফিকেট',
    certificateBody: 'কোর্স শেষ হলে যাচাইযোগ্য সার্টিফিকেট পাবেন, লিংক যে কেউ খুলে দেখতে পারবে।',
    duration: 'মোট সময়',
    minutes: 'মিনিট',
    instructor: 'শিক্ষক পরিচিতি',
    coupon: 'কুপন থাকলে লিখুন',
    couponPlaceholder: 'যেমন EARLYBIRD',
    couponApply: 'কুপনসহ এগিয়ে যান',
    moneyBack: '১৪ দিনের মধ্যে টাকা ফেরতের শর্ত প্রযোজ্য।',
    moneyBackLink: 'ফেরত নীতি দেখুন',
    related: 'একই বিষয়ের অন্য কোর্স',
    ratings: 'রেটিং',
    ratingCount: 'টি মতামত',
    aboutInstructor: 'পরিচিতি',
    includes: 'কোর্সে যা আছে',
    includesLessons: 'পাঠ ও অনুশীলন',
    includesAccess: 'স্থায়ী অ্যাক্সেস',
    includesLive: 'লাইভ প্রশ্নোত্তর',
    includesCertificate: 'যাচাইযোগ্য সার্টিফিকেট',
  },
  en: {
    by: 'Teacher',
    curriculum: 'Curriculum',
    lessons: 'lessons',
    outcomes: 'What you will learn',
    requirements: 'What you need',
    audience: 'Who it is for',
    about: 'About this course',
    faq: 'Common questions',
    enrol: 'Enrol in this course',
    signIn: 'Sign in to enrol',
    free: 'Free',
    preview: 'Preview',
    previewBody: 'Read this lesson for free before you decide.',
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
    level: 'Level',
    levels: { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' },
    language: 'Language',
    updated: 'Last updated',
    certificate: 'Certificate',
    certificateBody: 'Finish the course and get a verifiable certificate anyone can open from a link.',
    duration: 'Total time',
    minutes: 'minutes',
    instructor: 'Your teacher',
    coupon: 'Have a coupon?',
    couponPlaceholder: 'e.g. EARLYBIRD',
    couponApply: 'Continue with coupon',
    moneyBack: 'The 14-day refund conditions apply.',
    moneyBackLink: 'Read the refund policy',
    related: 'More in this subject',
    ratings: 'Ratings',
    ratingCount: 'reviews',
    aboutInstructor: 'About',
    includes: 'This course includes',
    includesLessons: 'Lessons and practice',
    includesAccess: 'Permanent access',
    includesLive: 'Live question sessions',
    includesCertificate: 'A verifiable certificate',
  },
} as const;

/** Pick the language that was actually written, falling back to the other side. */
function pick(value: { bn?: string; en?: string } | null | undefined, language: Locale): string {
  if (!value) return '';
  return value[language] ?? value.en ?? value.bn ?? '';
}

/** Dates follow the reader's locale, so Bangla shows Bangla digits. */
function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale === 'en' ? 'en-GB' : 'bn-BD', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Public course page: everything a buyer needs before paying, then one clear action. */
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
  const priceLabel = course.pricePaisa === 0 ? copy.free : formatPaisa(course.pricePaisa, language);
  const initials = course.instructor.name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('');
  const ratingTotal = Object.values(course.ratingBreakdown).reduce((total, count) => total + count, 0);

  return (
    <div className={styles.page}>
      <div className="container">
        <Link href="/courses" className={styles.back}>
          ← {copy.back}
        </Link>
        {error ? <Alert tone="error">{error}</Alert> : null}

        <header className={styles.hero}>
          <div className={styles.badges}>
            <Badge>{pick(course.categoryName, language) || copy.level}</Badge>
            <Badge tone="neutral">{copy.levels[course.level]}</Badge>
            <Badge tone="neutral">{course.language === 'bn' ? 'বাংলা' : 'English'}</Badge>
          </div>
          <h1 className={styles.title}>{pick(course.title, language)}</h1>
          <p className={styles.subtitle}>{pick(course.shortDescription ?? course.subtitle, language)}</p>
          <p className={styles.meta}>
            {copy.by} <strong>{course.instructor.name}</strong> · ★ {course.ratingAverage.toFixed(1)} (
            {course.ratingCount} {copy.ratingCount}) · {lessonCount} {copy.lessons} ·{' '}
            {copy.updated} {formatDate(course.updatedAt, locale)}
          </p>
        </header>

        <div className={styles.layout}>
          <div className={styles.main}>
            {pick(course.description, language) ? (
              <section className={styles.section}>
                <h2>{copy.about}</h2>
                <p className={styles.lede}>{pick(course.description, language)}</p>
              </section>
            ) : null}

            {course.outcomes.length > 0 ? (
              <section className={styles.section}>
                <h2>{copy.outcomes}</h2>
                <ul className={styles.outcomes}>
                  {course.outcomes.map((outcome, index) => (
                    <li key={`${index}-${pick(outcome, language)}`}>
                      <span aria-hidden="true" className={styles.tick}>
                        ✓
                      </span>
                      {pick(outcome, language)}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {(course.requirements.length > 0 || course.audience.length > 0) && (
              <div className={styles.pair}>
                {course.requirements.length > 0 ? (
                  <section className={styles.section}>
                    <h2>{copy.requirements}</h2>
                    <ul className={styles.list}>
                      {course.requirements.map((requirement, index) => (
                        <li key={`req-${index}`}>{pick(requirement, language)}</li>
                      ))}
                    </ul>
                  </section>
                ) : null}
                {course.audience.length > 0 ? (
                  <section className={styles.section}>
                    <h2>{copy.audience}</h2>
                    <ul className={styles.list}>
                      {course.audience.map((item, index) => (
                        <li key={`aud-${index}`}>{pick(item, language)}</li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </div>
            )}

            <section className={styles.section}>
              <h2>{copy.curriculum}</h2>
              {course.sections.length === 0 ? <p className={styles.meta}>{copy.noLessons}</p> : null}
              <div className={styles.syllabus}>
                {course.sections.map((section, sectionIndex) => (
                  <details key={section.id} className={styles.accordion} open={sectionIndex === 0}>
                    <summary className={styles.accordionHead}>
                      <span className={styles.accordionTitle}>{pick(section.title, language)}</span>
                      <span className={styles.accordionMeta}>
                        {section.lessons.length} {copy.lessons} · {section.durationMinutes} {copy.minutes}
                      </span>
                    </summary>
                    <ol className={styles.lessonList}>
                      {section.lessons.map((lesson) => (
                        <li key={lesson.id}>
                          <span>{pick(lesson.title, language)}</span>
                          <span className={styles.lessonMeta}>
                            {copy[lesson.type]}
                            {lesson.durationMinutes > 0 ? ` · ${lesson.durationMinutes} ${copy.minutes}` : ''}
                            {lesson.isPreview ? (
                              <>
                                {' · '}
                                <Link href={`/courses/${course.slug}/preview/${lesson.id}`} className={styles.previewLink}>
                                  {copy.preview}
                                </Link>
                              </>
                            ) : null}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </details>
                ))}
              </div>
            </section>

            <section className={styles.section} aria-labelledby="teacher">
              <h2 id="teacher">{copy.instructor}</h2>
              <Card className={styles.instructor}>
                <span className={styles.avatar} aria-hidden="true">
                  {initials}
                </span>
                <div>
                  <p className={styles.instructorName}>{course.instructor.name}</p>
                  <p className={styles.meta}>{pick(course.instructor.bio, language) || copy.by}</p>
                </div>
              </Card>
            </section>

            {course.faqs.length > 0 ? (
              <section className={styles.section}>
                <h2>{copy.faq}</h2>
                <div className={styles.syllabus}>
                  {course.faqs.map((faq, index) => (
                    <details key={index} className={styles.accordion}>
                      <summary className={styles.accordionHead}>
                        <span className={styles.accordionTitle}>{pick(faq.question, language)}</span>
                      </summary>
                      <p className={styles.faqAnswer}>{pick(faq.answer, language)}</p>
                    </details>
                  ))}
                </div>
              </section>
            ) : null}

            {liveSessions.length > 0 ? (
              <section className={styles.section}>
                <h2>{copy.live}</h2>
                <ul className={styles.list}>
                  {liveSessions.map((liveSession) => (
                    <li key={liveSession.id}>
                      <strong>{pick(liveSession.title, language)}</strong> ·{' '}
                      {new Date(liveSession.startsAt).toLocaleString(locale === 'en' ? 'en-GB' : 'bn-BD', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}{' '}
                      · {liveSession.durationMinutes} {copy.minutes}
                    </li>
                  ))}
                </ul>
                <Link href={`/live/${course.slug}`} className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
                  {copy.liveRoom}
                </Link>
              </section>
            ) : null}

            <section id="reviews" className={styles.section}>
              <h2>{copy.reviews}</h2>
              {ratingTotal > 0 ? (
                <div className={styles.histogram}>
                  <div className={styles.histogramScore}>
                    <strong>{course.ratingAverage.toFixed(1)}</strong>
                    <span aria-hidden="true">★★★★★</span>
                    <span className={styles.meta}>
                      {course.ratingCount} {copy.ratingCount}
                    </span>
                  </div>
                  <ul className={styles.histogramBars}>
                    {([5, 4, 3, 2, 1] as const).map((star) => {
                      const count = course.ratingBreakdown[star];
                      const percent = ratingTotal > 0 ? Math.round((count / ratingTotal) * 100) : 0;
                      return (
                        <li key={star}>
                          <span className={styles.starLabel}>{star} ★</span>
                          <span className={styles.barTrack}>
                            <span className={styles.barFill} style={{ width: `${percent}%` }} />
                          </span>
                          <span className={styles.barCount}>{count}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
              {reviews.length === 0 ? <p className={styles.meta}>{copy.noReviews}</p> : null}
              <ul className={styles.reviewList}>
                {reviews.map((review) => (
                  <li key={review.id} className={styles.review}>
                    <p className={styles.reviewHead}>
                      <strong>{review.author}</strong> · <span aria-label={`${review.rating} of 5`}>★ {review.rating}</span> ·{' '}
                      <span className={styles.meta}>{formatDate(review.createdAt, locale)}</span>
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

          <aside className={styles.side}>
            <Card className={styles.buyCard}>
              <p className={styles.price}>{priceLabel}</p>
              <ul className={styles.includes}>
                <li>{course.outcomes.length > 0 ? copy.includesLessons : copy.lessons}</li>
                <li>{copy.includesAccess}</li>
                <li>{copy.includesLive}</li>
                <li>{copy.includesCertificate}</li>
              </ul>

              {!session?.user ? (
                <Link href="/sign-in" className={buttonStyles()}>
                  {copy.signIn}
                </Link>
              ) : viewer?.enrolled ? (
                <Link href={`/learn/${course.slug}`} className={buttonStyles()}>
                  {copy.continue}
                </Link>
              ) : course.pricePaisa > 0 ? (
                <>
                  <form action={startCheckoutAction} className={styles.form}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="courseId" value={course.id} />
                    <input type="hidden" name="slug" value={course.slug} />
                    <Field
                      id="course-coupon"
                      name="couponCode"
                      label={copy.coupon}
                      placeholder={copy.couponPlaceholder}
                      maxLength={32}
                    />
                    <Button type="submit" className={styles.fullButton}>
                      {copy.buy}
                    </Button>
                  </form>
                  <p className={styles.note}>{copy.testNote}</p>
                </>
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

              <p className={styles.note}>{copy.note}</p>
              <dl className={styles.facts}>
                <div>
                  <dt>{copy.level}</dt>
                  <dd>{copy.levels[course.level]}</dd>
                </div>
                <div>
                  <dt>{copy.language}</dt>
                  <dd>{course.language === 'bn' ? 'বাংলা' : 'English'}</dd>
                </div>
                <div>
                  <dt>{copy.duration}</dt>
                  <dd>
                    {course.totalDurationMinutes} {copy.minutes}
                  </dd>
                </div>
                <div>
                  <dt>{copy.certificate}</dt>
                  <dd>{copy.includesCertificate}</dd>
                </div>
              </dl>
              <p className={styles.refund}>
                {copy.moneyBack}{' '}
                <Link href="/refund-policy" className={styles.refundLink}>
                  {copy.moneyBackLink}
                </Link>
              </p>
            </Card>
          </aside>
        </div>

        {course.related.length > 0 ? (
          <section className={styles.related}>
            <h2>{copy.related}</h2>
            <ul className={styles.relatedGrid}>
              {course.related.map((item) => (
                <li key={item.id}>
                  <Card className={styles.relatedCard}>
                    <p className={styles.relatedMeta}>{pick(item.categoryName, language)}</p>
                    <h3>{pick(item.title, language)}</h3>
                    <p className={styles.meta}>
                      ★ {item.ratingAverage.toFixed(1)} · {item.pricePaisa === 0 ? copy.free : formatPaisa(item.pricePaisa, language)}
                    </p>
                    <Link href={`/courses/${item.slug}`} className={styles.relatedLink}>
                      {copy.by} {item.instructorName} →
                    </Link>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}

import { getInstructorCommunity } from '@pathshala/db';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Link } from '@/i18n/navigation';
import { requireRole } from '@/lib/auth/guard';
import { announceAction, replyToReviewAction } from './actions';
import styles from '../studio.module.css';

type CommunityPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; saved?: string; sent?: string }>;
};

/** One place for the teacher's public voice: review replies and course announcements. */
export default async function StudioCommunityPage({ params, searchParams }: CommunityPageProps) {
  const { locale } = await params;
  const { error, saved, sent } = await searchParams;
  const user = await requireRole('instructor', 'admin');
  const community = await getInstructorCommunity(user.id, user.roles.includes('admin'));
  const copy =
    locale === 'en'
      ? {
          eyebrow: 'Studio',
          title: 'Reviews and announcements',
          lede: 'Answer learners in public and send one update to everyone enrolled in a course.',
          announce: 'Announce to learners',
          announceHint: 'The message appears in each learner’s inbox. It is not sent by email.',
          chooseCourse: 'Course',
          message: 'Message',
          send: 'Send announcement',
          sent: (count: string) => `Announcement added to ${count} inbox${count === '1' ? '' : 'es'}.`,
          reviews: 'Recent reviews',
          emptyReviews: 'No visible reviews yet.',
          reply: 'Instructor reply',
          replyLabel: 'Your reply',
          postReply: 'Post reply',
          replaceReply: 'Replace reply',
          saved: 'Reply saved.',
          emptyCourses: 'Publish a course before announcing to learners.',
        }
      : {
          eyebrow: 'স্টুডিও',
          title: 'মতামত ও ঘোষণা',
          lede: 'শিক্ষার্থীদের সামনে উত্তর দিন, আর একটি কোর্সের সবাইকে একবারে খবর পাঠান।',
          announce: 'শিক্ষার্থীদের জানান',
          announceHint: 'বার্তাটি প্রত্যেক শিক্ষার্থীর ইনবক্সে যাবে। ইমেইলে পাঠানো হবে না।',
          chooseCourse: 'কোর্স',
          message: 'বার্তা',
          send: 'ঘোষণা পাঠান',
          sent: (count: string) => `${count} জনের ইনবক্সে ঘোষণাটি পৌঁছেছে।`,
          reviews: 'সাম্প্রতিক মতামত',
          emptyReviews: 'এখনো কোনো দৃশ্যমান মতামত নেই।',
          reply: 'প্রশিক্ষকের উত্তর',
          replyLabel: 'আপনার উত্তর',
          postReply: 'উত্তর দিন',
          replaceReply: 'উত্তর বদলান',
          saved: 'উত্তর সংরক্ষিত হয়েছে।',
          emptyCourses: 'শিক্ষার্থীদের কিছু জানাতে আগে একটি কোর্স প্রকাশ করুন।',
        };

  return (
    <div className={styles.page}>
      <div className="container">
        <Link href="/studio" className={styles.back}>
          {locale === 'en' ? '← Back to studio' : '← স্টুডিওতে ফিরুন'}
        </Link>
        <p className={styles.eyebrow}>{copy.eyebrow}</p>
        <h1 className={styles.title}>{copy.title}</h1>
        <p className={styles.lede}>{copy.lede}</p>
        {error ? <Alert tone="error">{error}</Alert> : null}
        {saved ? <Alert tone="success">{copy.saved}</Alert> : null}
        {sent ? <Alert tone="success">{copy.sent(sent)}</Alert> : null}

        <section className={styles.panel} aria-labelledby="announce">
          <h2 id="announce" className={styles.sectionHeading}>
            {copy.announce}
          </h2>
          {community.courses.length === 0 ? (
            <p className={styles.empty}>{copy.emptyCourses}</p>
          ) : (
            <form action={announceAction} className={styles.form}>
              <input type="hidden" name="locale" value={locale} />
              <Select
                id="announce-course"
                name="courseId"
                label={copy.chooseCourse}
                required
                options={community.courses.map((course) => ({
                  value: course.id,
                  label: course.title[locale === 'en' ? 'en' : 'bn'] ?? course.title.en ?? course.title.bn ?? '',
                }))}
              />
              <div>
                <label htmlFor="announce-message" className={styles.textareaLabel}>
                  {copy.message}
                </label>
                <textarea
                  id="announce-message"
                  name="message"
                  className={styles.textarea}
                  rows={4}
                  maxLength={1000}
                  required
                  aria-describedby="announce-hint"
                />
                <p id="announce-hint" className={styles.meta}>
                  {copy.announceHint}
                </p>
              </div>
              <Button type="submit">{copy.send}</Button>
            </form>
          )}
        </section>

        <section className={styles.panel} aria-labelledby="reviews">
          <h2 id="reviews" className={styles.sectionHeading}>
            {copy.reviews}
          </h2>
          {community.reviews.length === 0 ? <p className={styles.empty}>{copy.emptyReviews}</p> : null}
          <ul className={styles.reviewList}>
            {community.reviews.map((review) => (
              <li key={review.id} className={styles.reviewCard}>
                <p className={styles.meta}>
                  {review.courseTitle[locale === 'en' ? 'en' : 'bn'] ?? review.courseTitle.en ?? ''} · {review.author} · ★{' '}
                  {review.rating} · {new Date(review.createdAt).toLocaleDateString(locale)}
                </p>
                {review.body ? <p>{review.body}</p> : null}
                {review.replyBody ? (
                  <div className={styles.reply}>
                    <strong>{copy.reply}</strong>
                    <p>{review.replyBody}</p>
                  </div>
                ) : null}
                <form action={replyToReviewAction} className={styles.replyForm}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="reviewId" value={review.id} />
                  <label htmlFor={`reply-${review.id}`} className={styles.textareaLabel}>
                    {copy.replyLabel}
                  </label>
                  <textarea
                    id={`reply-${review.id}`}
                    name="body"
                    className={styles.textarea}
                    rows={3}
                    maxLength={1200}
                    required
                  />
                  <Button type="submit" variant="secondary">
                    {review.replyBody ? copy.replaceReply : copy.postReply}
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

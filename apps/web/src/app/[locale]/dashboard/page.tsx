import { getTranslations } from 'next-intl/server';
import type { UserRole } from '@pathshala/db';
import { formatPaisa } from '@pathshala/shared';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import { signOutAction } from '@/lib/auth/actions';
import { requireUser } from '@/lib/auth/guard';
import { Review, dispatchDueReminders, getLearnerHome, getNotifications, getUpcomingForStudent, recommendedForStudent } from '@pathshala/db';
import { CourseShelf } from '@/components/course-shelf';
import { getDashboardLearning } from '@/lib/learning';
import { markNotificationReadAction } from './notification-actions';
import styles from './dashboard.module.css';

/** Badge keys are stable data; the visible label follows the reader's language. */
function badgeName(key: string, english: boolean): string {
  const labels: Record<string, [string, string]> = {
    first_lesson: ['প্রথম পাঠ', 'First lesson'],
    five_lessons: ['পাঁচটি পাঠ', 'Five lessons'],
    twenty_lessons: ['বিশটি পাঠ', 'Twenty lessons'],
    first_course: ['প্রথম কোর্স', 'First course'],
    streak_3: ['তিন দিনের ধারা', 'Three-day streak'],
    streak_7: ['সাত দিনের ধারা', 'Seven-day streak'],
    reviewer: ['প্রথম মতামত', 'First review'],
  };
  const entry = labels[key];
  return entry ? entry[english ? 1 : 0] : key;
}

/** Signed-in home. Course progress and enrolments plug into the empty panel in P2. */
export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await requireUser();
  const t = await getTranslations('Dashboard');
  const roles = await getTranslations('Roles');
  const roleLabel = (role: UserRole) => roles(role);
  const reminders = await dispatchDueReminders(user.id);
  const [learning, notifications, upcoming, reviewsWritten] = await Promise.all([
    getDashboardLearning(user.id),
    getNotifications(user.id),
    getUpcomingForStudent(user.id),
    Review.countDocuments({ student: user.id }),
  ]);
  const [home, recommended] = await Promise.all([
    getLearnerHome(user.id, reviewsWritten),
    recommendedForStudent(user.id, 3),
  ]);
  const earned = home.badges.filter((badge) => badge.earned);

  return (
    <div className={styles.page}>
      <div className="container">
        <p className={styles.eyebrow}>{t('eyebrow')}</p>
        <h1 className={styles.title}>{t('title')}</h1>

        <div className={styles.grid}>
          <Card className={styles.profile}>
            {user.image ? (
              <img src={user.image} alt="" className={styles.avatar} />
            ) : null}
            <p className={styles.name}>{user.name}</p>
            <p className={styles.email}>{user.email}</p>
            <p className={styles.rolesLabel}>{t('roles')}</p>
            <div className={styles.roles}>
              {user.roles.map((role) => (
                <Badge key={role} tone="accent">
                  {roleLabel(role)}
                </Badge>
              ))}
            </div>
            <nav className={styles.accountNav} aria-label={locale === 'en' ? 'Account' : 'অ্যাকাউন্ট'}>
              <Link href="/dashboard/orders">{t('orders')}</Link>
              <Link href="/dashboard/notifications">{locale === 'en' ? 'Messages' : 'বার্তা'}</Link>
              <Link href="/dashboard/wishlist">{locale === 'en' ? 'Saved' : 'পরে দেখার তালিকা'}</Link>
              <Link href="/dashboard/notes">{locale === 'en' ? 'Notes' : 'নোট'}</Link>
              <Link href="/cart">{locale === 'en' ? 'Cart' : 'ঝুড়ি'}</Link>
              <Link href="/dashboard/settings">{locale === 'en' ? 'Settings' : 'সেটিংস'}</Link>
            </nav>
            <div className={styles.streak}>
              <p className={styles.streakValue}>{home.streak}</p>
              <p className={styles.courseMeta}>
                {locale === 'en' ? 'day streak' : 'দিনের ধারা'}
              </p>
            </div>
            {learning.certificateCount > 0 ? (
              <p className={styles.courseMeta}>
                {learning.certificateCount} {locale === 'en' ? 'certificate(s)' : 'টি সার্টিফিকেট'}
              </p>
            ) : null}
            <form action={signOutAction} className={styles.signOut}>
              <button type="submit" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
                {t('signOut')}
              </button>
            </form>
          </Card>

          <Card className={styles.panel}>
            <h2 className={styles.panelTitle}>{locale === 'en' ? 'Your learning' : 'আপনার শেখা'}</h2>
            {home.continueCourse ? (
              <div className={styles.continueBox}>
                <p className={styles.courseMeta}>{locale === 'en' ? 'Pick up where you stopped' : 'যেখানে ছেড়েছিলেন সেখান থেকেই'}</p>
                <p className={styles.continueTitle}>
                  {home.continueCourse.title[locale === 'en' ? 'en' : 'bn'] ?? home.continueCourse.title.en}
                </p>
                <Link
                  href={`/learn/${home.continueCourse.slug}${home.continueCourse.lessonId ? `?lesson=${home.continueCourse.lessonId}` : ''}`}
                  className={buttonStyles({ size: 'sm' })}
                >
                  {locale === 'en' ? 'Continue learning' : 'শেখা চালিয়ে যান'}
                </Link>
              </div>
            ) : null}
            {learning.courses.length === 0 ? (
              <>
                <p className={styles.panelBody}>{t('emptyBody')}</p>
                <div className={styles.actions}>
                  <Link href="/courses" className={buttonStyles()}>
                    {t('browse')}
                  </Link>
                  {user.roles.includes('admin') ? (
                    <Link href="/admin" className={buttonStyles({ variant: 'secondary' })}>
                      {t('adminPanel')}
                    </Link>
                  ) : null}
                </div>
              </>
            ) : (
              <ul className={styles.courseList}>
                {learning.courses.map((course) => (
                  <li key={course.id}>
                    <Link href={`/learn/${course.slug}`} className={styles.courseLink}>
                      <span className={styles.courseTitle}>{course.title[locale === 'en' ? 'en' : 'bn'] || course.title.en}</span>
                      <span className={styles.courseMeta}>{course.progressPercent}% · {course.status}</span>
                    </Link>
                    <div
                      className={styles.courseProgress}
                      role="progressbar"
                      aria-label={`${course.title[locale === 'en' ? 'en' : 'bn'] || course.title.en}: ${course.progressPercent}%`}
                      aria-valuenow={course.progressPercent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <span style={{ width: `${course.progressPercent}%` }} />
                    </div>
                    {course.certificateCode ? (
                      <Link href={`/verify/${course.certificateCode}`} className={styles.certificateLink}>
                        {locale === 'en' ? 'Certificate' : 'সার্টিফিকেট'}
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {recommended.length > 0 ? (
          <CourseShelf
            courses={recommended}
            language={locale === 'en' ? 'en' : 'bn'}
            title={locale === 'en' ? 'More in your subjects' : 'আপনার বিষয়ে আরও'}
            lede={
              locale === 'en'
                ? 'Picked from the subjects you already study, without repeating what you own.'
                : 'আপনি যে বিষয়ে পড়ছেন সেখান থেকেই, আগে কেনা কোর্স বাদ দিয়ে।'
            }
            browseLabel={locale === 'en' ? 'Browse all' : 'সব দেখুন'}
          />
        ) : null}

        <section className={styles.saved}>
          <h2 className={styles.panelTitle}>{locale === 'en' ? 'Badges' : 'ব্যাজ'}</h2>
          <ul className={styles.badges}>
            {home.badges.map((badge) => (
              <li key={badge.key} className={badge.earned ? styles.badgeEarned : styles.badge}>
                <span className={styles.badgeName}>{badgeName(badge.key, locale === 'en')}</span>
                {badge.earned ? null : (
                  <span className={styles.badgeBar} aria-hidden="true">
                    <span style={{ width: `${Math.round(badge.progress * 100)}%` }} />
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className={styles.courseMeta}>
            {earned.length} / {home.badges.length} {locale === 'en' ? 'earned' : 'অর্জিত'}
          </p>
        </section>

        {reminders.sent > 0 ? <Alert tone="success">{locale === 'en' ? `${reminders.sent} reminder delivered.` : `${reminders.sent}টি রিমাইন্ডার পাঠানো হয়েছে।`}</Alert> : null}

        {notifications.length > 0 ? (
          <section className={styles.saved}>
            <h2 className={styles.panelTitle}>{locale === 'en' ? 'Reminders' : 'মনে করানোর বার্তা'}</h2>
            <ul className={styles.notifications}>
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <div>
                    <p className={styles.notificationTitle}>{notification.title[locale === 'en' ? 'en' : 'bn'] || notification.title.en}</p>
                    <p className={styles.courseMeta}>{notification.body[locale === 'en' ? 'en' : 'bn'] || notification.body.en}</p>
                  </div>
                  <div className={styles.notificationActions}>
                    <Link href={notification.href}>{locale === 'en' ? 'Open' : 'খুলুন'}</Link>
                    <form action={markNotificationReadAction}>
                      <input type="hidden" name="id" value={notification.id} />
                      <input type="hidden" name="locale" value={locale} />
                      <button type="submit" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
                        {locale === 'en' ? 'Dismiss' : 'সরান'}
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {upcoming.length > 0 ? (
          <section className={styles.saved}>
            <h2 className={styles.panelTitle}>{locale === 'en' ? 'Upcoming live classes' : 'আসন্ন লাইভ ক্লাস'}</h2>
            <ul className={styles.wishlist}>
              {upcoming.map((session) => (
                <li key={session.id}>
                  <Link href={`/live/${session.courseSlug}`}>{session.title[locale === 'en' ? 'en' : 'bn'] || session.title.en}</Link>
                  <span>{new Date(session.startsAt).toLocaleString(locale)}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {learning.wishlist.length > 0 ? (
          <section className={styles.saved}>
            <h2 className={styles.panelTitle}>{locale === 'en' ? 'Saved for later' : 'পরে দেখার জন্য'}</h2>
            <ul className={styles.wishlist}>
              {learning.wishlist.map((course) => (
                <li key={course.id}>
                  <Link href={`/courses/${course.slug}`}>{course.title[locale === 'en' ? 'en' : 'bn'] || course.title.en}</Link>
                  <span>{formatPaisa(course.pricePaisa, locale === 'en' ? 'en' : 'bn')}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}

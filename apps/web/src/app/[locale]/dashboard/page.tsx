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
import { dispatchDueReminders, getNotifications, getUpcomingForStudent } from '@pathshala/db';
import { getDashboardLearning } from '@/lib/learning';
import { markNotificationReadAction } from './notification-actions';
import styles from './dashboard.module.css';

/** Signed-in home. Course progress and enrolments plug into the empty panel in P2. */
export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await requireUser();
  const t = await getTranslations('Dashboard');
  const roles = await getTranslations('Roles');
  const roleLabel = (role: UserRole) => roles(role);
  const reminders = await dispatchDueReminders(user.id);
  const [learning, notifications, upcoming] = await Promise.all([
    getDashboardLearning(user.id),
    getNotifications(user.id),
    getUpcomingForStudent(user.id),
  ]);

  return (
    <div className={styles.page}>
      <div className="container">
        <p className={styles.eyebrow}>{t('eyebrow')}</p>
        <h1 className={styles.title}>{t('title')}</h1>

        <div className={styles.grid}>
          <Card className={styles.profile}>
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
            <Link href="/dashboard/orders" className={styles.ordersLink}>
              {t('orders')}
            </Link>
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

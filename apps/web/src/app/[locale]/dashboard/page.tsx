import { getTranslations } from 'next-intl/server';
import type { UserRole } from '@pathshala/db';
import { formatPaisa } from '@pathshala/shared';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import { signOutAction } from '@/lib/auth/actions';
import { requireUser } from '@/lib/auth/guard';
import { getDashboardLearning } from '@/lib/learning';
import styles from './dashboard.module.css';

/** Signed-in home. Course progress and enrolments plug into the empty panel in P2. */
export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await requireUser();
  const t = await getTranslations('Dashboard');
  const roles = await getTranslations('Roles');
  const roleLabel = (role: UserRole) => roles(role);
  const learning = await getDashboardLearning(user.id);

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
                    <div className={styles.courseProgress} role="progressbar" aria-valuenow={course.progressPercent} aria-valuemin={0} aria-valuemax={100}>
                      <span style={{ width: `${course.progressPercent}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

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

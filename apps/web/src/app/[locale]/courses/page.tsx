import { getTranslations } from 'next-intl/server';
import { buttonStyles } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Link } from '@/i18n/navigation';
import styles from './courses.module.css';

/** Catalogue shell. Real course cards replace the empty state in P2. */
export default async function CoursesPage() {
  const t = await getTranslations('Courses');

  return (
    <div className={styles.page}>
      <div className="container">
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.lede}>{t('lede')}</p>
        <EmptyState
          className={styles.empty}
          title={t('emptyTitle')}
          body={t('emptyBody')}
          action={
            <Link href="/" className={buttonStyles({ variant: 'secondary' })}>
              {t('emptyAction')}
            </Link>
          }
        />
      </div>
    </div>
  );
}

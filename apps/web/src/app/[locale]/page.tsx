import { getTranslations } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import styles from './page.module.css';

const stepKeys = ['1', '2', '3'] as const;

/** Landing page: what Pathshala is, how a course runs, and the subjects being prepared. */
export default async function HomePage() {
  const t = await getTranslations('Home');
  const rawSubjects: unknown = t.raw('subjects');
  const subjects = Array.isArray(rawSubjects) ? rawSubjects.filter((subject): subject is string => typeof subject === 'string') : [];

  return (
    <>
      <section className={styles.hero}>
        <div className="container">
          <p className={styles.eyebrow}>{t('eyebrow')}</p>
          <h1 className={styles.title}>{t('title')}</h1>
          <p className={styles.lede}>{t('lede')}</p>
          <div className={styles.actions}>
            <Link href="/courses" className={buttonStyles()}>
              {t('primaryAction')}
            </Link>
            <a href="#how-it-works" className={styles.textLink}>
              {t('howItWorks')}
            </a>
          </div>
        </div>
      </section>

      <section id="how-it-works" className={styles.section}>
        <div className="container">
          <h2 className={styles.sectionTitle}>{t('howItWorks')}</h2>
          <ol className={styles.steps}>
            {stepKeys.map((step, index) => (
              <li key={step} className={styles.step}>
                <span className={styles.stepNumber} aria-hidden="true">
                  {`0${index + 1}`}
                </span>
                <h3 className={styles.stepTitle}>{t(`step${step}Title`)}</h3>
                <p className={styles.stepBody}>{t(`step${step}Body`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={styles.section}>
        <div className="container">
          <h2 className={styles.sectionTitle}>{t('subjectsTitle')}</h2>
          <ul className={styles.subjects}>
            {subjects.map((subject) => (
              <li key={subject}>
                <Badge>{subject}</Badge>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}

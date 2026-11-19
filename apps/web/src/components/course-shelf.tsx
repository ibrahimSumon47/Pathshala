import type { CatalogCourse } from '@pathshala/db';
import { formatPaisa, type Locale } from '@pathshala/shared';
import { Link } from '@/i18n/navigation';
import styles from './course-shelf.module.css';

type CourseShelfProps = {
  courses: CatalogCourse[];
  language: Locale;
  title: string;
  lede?: string;
  browseLabel: string;
  browseHref?: string;
};

/** A short row of real courses, shared by the landing page and the learner dashboard. */
export function CourseShelf({ courses, language, title, lede, browseLabel, browseHref = '/courses' }: CourseShelfProps) {
  if (courses.length === 0) return null;

  return (
    <section className={styles.shelf} aria-labelledby="course-shelf-title">
      <div className={styles.head}>
        <div>
          <h2 id="course-shelf-title" className={styles.title}>
            {title}
          </h2>
          {lede ? <p className={styles.lede}>{lede}</p> : null}
        </div>
        <Link href={browseHref} className={styles.browse}>
          {browseLabel}
        </Link>
      </div>
      <ul className={styles.list}>
        {courses.map((course) => (
          <li key={course.id}>
            <article className={styles.card}>
              {course.thumbnailUrl ? (
                <img
                  src={course.thumbnailUrl}
                  alt=""
                  className={styles.cover}
                  width={400}
                  height={225}
                  loading="lazy"
                />
              ) : null}
              <p className={styles.subject}>{course.categoryName?.[language] ?? course.level}</p>
              <h3 className={styles.courseTitle}>
                <Link href={`/courses/${course.slug}`}>{course.title[language] || course.title.en || course.title.bn}</Link>
              </h3>
              <p className={styles.meta}>
                {course.instructorName}
                {course.ratingCount > 0 ? ` · ★ ${course.ratingAverage.toFixed(1)} (${course.ratingCount})` : ''}
              </p>
              <p className={styles.price}>
                {course.pricePaisa === 0 ? (language === 'en' ? 'Free' : 'ফ্রি') : formatPaisa(course.pricePaisa, language)}
              </p>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}

import { getInstructorAnalytics, listAuthorCourses, listCategories } from '@pathshala/db';
import { formatPaisa, type Locale } from '@pathshala/shared';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { Link } from '@/i18n/navigation';
import { requireRole } from '@/lib/auth/guard';
import { createCourseAction } from './actions';
import { studioCopy } from './copy';
import styles from './studio.module.css';

type StudioPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
};

const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;

/** Instructor home: own courses, status and the create form. */
export default async function StudioPage({ params, searchParams }: StudioPageProps) {
  const { locale } = await params;
  const { error, saved } = await searchParams;
  const user = await requireRole('instructor', 'admin');
  const copy = studioCopy(locale === 'en' ? 'en' : 'bn');
  const [courses, categories, analytics] = await Promise.all([
    listAuthorCourses(user.id, user.roles.includes('admin')),
    listCategories(),
    getInstructorAnalytics(user.id),
  ]);

  return (
    <div className={styles.page}>
      <div className="container">
        <p className={styles.eyebrow}>{copy.eyebrow}</p>
        <h1 className={styles.title}>{copy.title}</h1>
        <p className={styles.lede}>{copy.lede}</p>
        <nav className={styles.subnav} aria-label={copy.eyebrow}>
          <Link href="/studio/earnings">{locale === 'en' ? 'Payout statements' : 'আয়ের বিবরণ'}</Link>
        </nav>
        <section className={styles.statGrid} aria-label={locale === 'en' ? 'Teaching analytics' : 'শিক্ষাদানের হিসাব'}>
          <div className={styles.stat}>
            <p className={styles.statLabel}>{locale === 'en' ? 'Revenue' : 'আয়'}</p>
            <p className={styles.statValue}>{formatPaisa(analytics.revenuePaisa, locale as Locale)}</p>
          </div>
          <div className={styles.stat}>
            <p className={styles.statLabel}>{locale === 'en' ? 'Paid sales' : 'পরিশোধিত বিক্রয়'}</p>
            <p className={styles.statValue}>{analytics.paidSales}</p>
          </div>
          <div className={styles.stat}>
            <p className={styles.statLabel}>{locale === 'en' ? 'Students' : 'শিক্ষার্থী'}</p>
            <p className={styles.statValue}>{analytics.studentCount}</p>
          </div>
          <div className={styles.stat}>
            <p className={styles.statLabel}>{locale === 'en' ? 'Completion' : 'সম্পন্নতা'}</p>
            <p className={styles.statValue}>{analytics.completionPercent}%</p>
          </div>
          <div className={styles.stat}>
            <p className={styles.statLabel}>{locale === 'en' ? 'Live attendance' : 'লাইভ উপস্থিতি'}</p>
            <p className={styles.statValue}>{analytics.attendanceCount}</p>
          </div>
        </section>
        {error ? <Alert tone="error">{error}</Alert> : null}
        {saved ? <Alert tone="success">{copy.saved}</Alert> : null}

        <section className={styles.list} aria-label={copy.title}>
          {courses.length === 0 ? <p className={styles.empty}>{copy.empty}</p> : null}
          {courses.map((course) => (
            <Card key={course.id} className={styles.courseCard}>
              <div>
                <div className={styles.cardTop}>
                  <Badge tone={course.publishedAt ? 'success' : 'neutral'}>
                    {course.publishedAt ? copy.published : copy.draft}
                  </Badge>
                  <span className={styles.meta}>{formatPaisa(course.pricePaisa, locale as Locale)}</span>
                </div>
                <h2 className={styles.courseTitle}>{course.title[locale as Locale] || course.title.en || course.title.bn}</h2>
                <p className={styles.meta}>
                  {course.categoryName?.[locale as Locale] ?? ''} · {course.instructorName}
                </p>
              </div>
              <Link href={`/studio/${course.id}`} className={styles.editLink}>
                {copy.edit}
              </Link>
            </Card>
          ))}
        </section>

        <section className={styles.panel} aria-labelledby="course-analytics">
          <h2 id="course-analytics" className={styles.sectionHeading}>
            {locale === 'en' ? 'Course performance' : 'কোর্সের ফলাফল'}
          </h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">{locale === 'en' ? 'Course' : 'কোর্স'}</th>
                  <th scope="col">{locale === 'en' ? 'Sales' : 'বিক্রয়'}</th>
                  <th scope="col">{locale === 'en' ? 'Revenue' : 'আয়'}</th>
                  <th scope="col">{locale === 'en' ? 'Enrolled' : 'নথিভুক্ত'}</th>
                  <th scope="col">{locale === 'en' ? 'Completed' : 'সম্পন্ন'}</th>
                  <th scope="col">{locale === 'en' ? 'Attended' : 'উপস্থিত'}</th>
                </tr>
              </thead>
              <tbody>
                {analytics.courses.map((row) => (
                  <tr key={row.id}>
                    <td>{row.title[locale as Locale] || row.title.en || row.title.bn}</td>
                    <td className={styles.num}>{row.paidSales}</td>
                    <td className={styles.num}>{formatPaisa(row.revenuePaisa, locale as Locale)}</td>
                    <td className={styles.num}>{row.enrolmentCount}</td>
                    <td className={styles.num}>
                      {row.completionCount} ({row.enrolmentCount ? Math.round((row.completionCount / row.enrolmentCount) * 100) : 0}%)
                    </td>
                    <td className={styles.num}>{row.attendanceCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {analytics.courses.length === 0 ? <p className={styles.empty}>{copy.empty}</p> : null}
        </section>

        <section className={styles.panel} aria-labelledby="new-course">
          <h2 id="new-course" className={styles.sectionHeading}>
            {copy.createTitle}
          </h2>
          <form action={createCourseAction} className={styles.form}>
            <input type="hidden" name="locale" value={locale} />
            <div className={styles.two}>
              <Field id="titleBn" name="titleBn" label={copy.titleBn} maxLength={200} />
              <Field id="titleEn" name="titleEn" label={copy.titleEn} maxLength={200} />
            </div>
            <div className={styles.two}>
              <Field id="subtitleBn" name="subtitleBn" label={copy.subtitleBn} maxLength={200} />
              <Field id="subtitleEn" name="subtitleEn" label={copy.subtitleEn} maxLength={200} />
            </div>
            <Field id="slug" name="slug" label={copy.slug} hint={copy.slugHint} maxLength={90} />
            <div className={styles.three}>
              <Select
                id="categoryId"
                name="categoryId"
                label={copy.category}
                required
                options={categories.map((category) => ({
                  value: category.id,
                  label: category.name[locale === 'en' ? 'en' : 'bn'] ?? category.name.en ?? category.slug,
                }))}
              />
              <Field id="priceTaka" name="priceTaka" type="number" min={0} step={1} defaultValue={0} label={copy.price} />
              <Select
                id="level"
                name="level"
                label={copy.level}
                defaultValue="beginner"
                options={LEVELS.map((level) => ({ value: level, label: copy.levels[level] }))}
              />
            </div>
            <Select
              id="language"
              name="language"
              label={copy.language}
              defaultValue={locale === 'en' ? 'en' : 'bn'}
              options={[
                { value: 'bn', label: 'বাংলা' },
                { value: 'en', label: 'English' },
              ]}
            />
            <Button type="submit">{copy.create}</Button>
          </form>
        </section>
      </div>
    </div>
  );
}

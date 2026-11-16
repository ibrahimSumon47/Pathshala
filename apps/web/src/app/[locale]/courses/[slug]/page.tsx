import { getCourseBySlug } from '@pathshala/db';
import { formatPaisa, type Locale } from '@pathshala/shared';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import styles from './course.module.css';

type CoursePageProps = { params: Promise<{ locale: string; slug: string }> };

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
  },
} as const;

/** Public course page with teacher, curriculum and the enrolment entry point. */
export default async function CoursePage({ params }: CoursePageProps) {
  const { locale, slug } = await params;
  const language = (locale === 'en' ? 'en' : 'bn') as Locale;
  const copy = COPY[language];
  const course = await getCourseBySlug(slug);
  if (!course) notFound();

  const lessonCount = course.sections.reduce((total, section) => total + section.lessons.length, 0);

  return (
    <div className={styles.page}>
      <div className="container">
        <Link href="/courses" className={styles.back}>
          ← {copy.back}
        </Link>
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
          </div>

          <Card className={styles.buyCard}>
            <p className={styles.price}>{course.pricePaisa === 0 ? copy.free : formatPaisa(course.pricePaisa, language)}</p>
            <p className={styles.meta}>
              {lessonCount} {copy.lessons}
            </p>
            <Link href="/sign-in" className={buttonStyles()}>
              {copy.signIn}
            </Link>
            <p className={styles.note}>{copy.note}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

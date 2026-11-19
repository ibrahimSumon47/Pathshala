import { getPreviewLesson } from '@pathshala/db';
import type { Locale } from '@pathshala/shared';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { sanitizeLessonHtml } from '@/lib/sanitize';
import styles from './preview.module.css';

type PreviewProps = { params: Promise<{ locale: string; slug: string; lessonId: string }> };

const COPY = {
  bn: {
    back: 'কোর্সে ফিরুন',
    preview: 'বিনামূল্যের পাঠ',
    note: 'এটি কোর্সের একটি প্রিভিউ পাঠ। বাকি পাঠগুলো দেখতে কোর্সে ভর্তি হন।',
    enrol: 'কোর্সটি দেখুন',
    attachments: 'সংযুক্তি',
  },
  en: {
    back: 'Back to course',
    preview: 'Free preview',
    note: 'This is one preview lesson. Enrol to open the rest of the course.',
    enrol: 'View the course',
    attachments: 'Attachments',
  },
} as const;

/** A single free lesson, readable without an account and without exposing the rest. */
export default async function PreviewLessonPage({ params }: PreviewProps) {
  const { locale, slug, lessonId } = await params;
  const language = (locale === 'en' ? 'en' : 'bn') as Locale;
  const copy = COPY[language];
  const lesson = await getPreviewLesson(slug, lessonId);
  if (!lesson) notFound();
  const text = (value: { bn?: string; en?: string }) => value[language] ?? value.en ?? value.bn ?? '';
  const courseTitle = text(lesson.courseTitle);

  return (
    <div className={styles.page}>
      <div className="container">
        <Link href={`/courses/${lesson.courseSlug}`} className={styles.back}>
          ← {copy.back}
        </Link>
        <div className={styles.head}>
          <Badge tone="accent" className={styles.badge}>
            {copy.preview}
          </Badge>
          <p className={styles.eyebrow}>{courseTitle}</p>
          <h1>{text(lesson.title)}</h1>
          <p className={styles.meta}>
            {text(lesson.sectionTitle)}
            {lesson.durationMinutes > 0 ? ` · ${lesson.durationMinutes} ${language === 'en' ? 'minutes' : 'মিনিট'}` : ''}
          </p>
        </div>
        {lesson.bodyHtml ? (
          <>
            {/* nosemgrep: typescript.react.security.audit.react-dangerouslysetinnerhtml.react-dangerouslysetinnerhtml -- the body is sanitized before it reaches this render */}
            <div className={styles.body} dangerouslySetInnerHTML={{ __html: sanitizeLessonHtml(lesson.bodyHtml) }} />
          </>
        ) : null}
        {lesson.attachments.length > 0 ? (
          <section className={styles.attachments}>
            <h2>{copy.attachments}</h2>
            <ul>
              {lesson.attachments.map((attachment) => (
                <li key={attachment.url}>
                  <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                    {attachment.name}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <div className={styles.footer}>
          <p>{copy.note}</p>
          <Link href={`/courses/${lesson.courseSlug}`} className={buttonStyles()}>
            {copy.enrol}
          </Link>
        </div>
      </div>
    </div>
  );
}

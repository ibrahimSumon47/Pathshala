import { getSurveyableCourses } from '@pathshala/db';
import type { Locale } from '@pathshala/shared';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Select } from '@/components/ui/select';
import { Link } from '@/i18n/navigation';
import { requireUser } from '@/lib/auth/guard';
import { submitSurveyAction } from './actions';
import styles from './surveys.module.css';

type SurveysPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
};

const COPY = {
  bn: {
    eyebrow: 'আপনার অ্যাকাউন্ট',
    title: 'কোর্স সমীক্ষা',
    lede: 'শেষ করা কোর্সটি কেমন লেগেছে, তিনটি ছোট প্রশ্নে জানান। উত্তর শিক্ষককে গড় হিসেবে দেখা হয়, নাম ছাড়া।',
    empty: 'শেষ করা কোর্স নেই। কোর্স শেষ হলে এখানে সমীক্ষা আসবে।',
    completed: 'শেষ হয়েছে',
    answered: 'আপনার উত্তর সংরক্ষিত আছে; চাইলে বদলাতে পারেন।',
    difficulty: 'কোর্সটি কতটা কঠিন ছিল',
    pace: 'গতি কেমন ছিল',
    confidence: 'এখন বিষয়টি নিয়ে আত্মবিশ্বাস',
    comment: 'আর কিছু বলতে চান? (ঐচ্ছিক)',
    save: 'সমীক্ষা সংরক্ষণ করুন',
    update: 'উত্তর হালনাগাদ করুন',
    saved: 'ধন্যবাদ — আপনার সমীক্ষা সংরক্ষিত হয়েছে।',
    back: '← ড্যাশবোর্ডে ফিরুন',
    difficultyOptions: ['খুব সহজ', 'সহজ', 'ঠিকঠাক', 'কঠিন', 'খুব কঠিন'],
    paceOptions: ['খুব ধীর', 'ধীর', 'ঠিকঠাক', 'দ্রুত', 'খুব দ্রুত'],
    confidenceOptions: ['এখনো কম', 'একটু', 'মাঝারি', 'ভালো', 'খুব ভালো'],
  },
  en: {
    eyebrow: 'Your account',
    title: 'Course surveys',
    lede: 'Three short questions about a course you finished. Teachers see the averages, never your name.',
    empty: 'No completed courses yet. A survey appears here once you finish one.',
    completed: 'Completed',
    answered: 'Your answer is saved; you can change it.',
    difficulty: 'How hard was the course',
    pace: 'How was the pace',
    confidence: 'How confident do you feel now',
    comment: 'Anything else? (optional)',
    save: 'Save survey',
    update: 'Update answer',
    saved: 'Thank you — your survey is saved.',
    back: '← Back to dashboard',
    difficultyOptions: ['Very easy', 'Easy', 'About right', 'Hard', 'Very hard'],
    paceOptions: ['Too slow', 'Slow', 'About right', 'Fast', 'Too fast'],
    confidenceOptions: ['Not yet', 'A little', 'Somewhat', 'Confident', 'Very confident'],
  },
} as const;

const SCALE = [1, 2, 3, 4, 5] as const;

/** Short completion survey for finished courses; one answer per course, editable later. */
export default async function SurveysPage({ params, searchParams }: SurveysPageProps) {
  const { locale } = await params;
  const { error, saved } = await searchParams;
  const language = (locale === 'en' ? 'en' : 'bn') as Locale;
  const copy = COPY[language];
  const user = await requireUser();
  const courses = await getSurveyableCourses(user.id);

  return (
    <div className={styles.page}>
      <div className="container">
        <p className={styles.eyebrow}>{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
        <p className={styles.lede}>{copy.lede}</p>
        {error ? <Alert tone="error">{error}</Alert> : null}
        {saved ? <Alert tone="success">{copy.saved}</Alert> : null}

        {courses.length === 0 ? (
          <EmptyState title={copy.empty} body={copy.lede} />
        ) : (
          <ul className={styles.list}>
            {courses.map((course) => (
              <li key={course.courseId}>
                <Card className={styles.item}>
                  <div>
                    <h2 className={styles.title}>{course.title[language] ?? course.title.en ?? course.title.bn ?? ''}</h2>
                    <p className={styles.meta}>
                      {copy.completed}
                      {course.completedAt ? ` · ${new Date(course.completedAt).toLocaleDateString(locale)}` : ''}
                    </p>
                    {course.survey ? <p className={styles.meta}>{copy.answered}</p> : null}
                  </div>
                  <form action={submitSurveyAction} className={styles.form}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="courseId" value={course.courseId} />
                    <div className={styles.row}>
                      <Select
                        id={`difficulty-${course.courseId}`}
                        name="difficulty"
                        label={copy.difficulty}
                        defaultValue={String(course.survey?.difficulty ?? 3)}
                        options={SCALE.map((value) => ({
                          value: String(value),
                          label: `${value} — ${copy.difficultyOptions[value - 1]}`,
                        }))}
                      />
                      <Select
                        id={`pace-${course.courseId}`}
                        name="pace"
                        label={copy.pace}
                        defaultValue={String(course.survey?.pace ?? 3)}
                        options={SCALE.map((value) => ({
                          value: String(value),
                          label: `${value} — ${copy.paceOptions[value - 1]}`,
                        }))}
                      />
                      <Select
                        id={`confidence-${course.courseId}`}
                        name="confidence"
                        label={copy.confidence}
                        defaultValue={String(course.survey?.confidence ?? 3)}
                        options={SCALE.map((value) => ({
                          value: String(value),
                          label: `${value} — ${copy.confidenceOptions[value - 1]}`,
                        }))}
                      />
                    </div>
                    <div className={styles.textareaField}>
                      <label htmlFor={`comment-${course.courseId}`} className={styles.textareaLabel}>
                        {copy.comment}
                      </label>
                      <textarea
                        id={`comment-${course.courseId}`}
                        name="comment"
                        className={styles.textarea}
                        rows={3}
                        maxLength={500}
                        defaultValue={course.survey?.comment ?? ''}
                      />
                    </div>
                    <div>
                      <Button type="submit">{course.survey ? copy.update : copy.save}</Button>
                    </div>
                  </form>
                </Card>
              </li>
            ))}
          </ul>
        )}

        <p className={styles.back}>
          <Link href="/dashboard">{copy.back}</Link>
        </p>
      </div>
    </div>
  );
}

import { getInstructorQuestions } from '@pathshala/db';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { requireRole } from '@/lib/auth/guard';
import { answerStudioQuestionAction } from './actions';
import styles from '../studio.module.css';

type QuestionsPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
};

/** Lesson Q&A across the teacher's courses, with unanswered threads first. */
export default async function StudioQuestionsPage({ params, searchParams }: QuestionsPageProps) {
  const { locale } = await params;
  const { error, saved } = await searchParams;
  const user = await requireRole('instructor', 'admin');
  const desk = await getInstructorQuestions(user.id, user.roles.includes('admin'));
  const copy =
    locale === 'en'
      ? {
          back: '← Back to studio',
          eyebrow: 'Studio',
          title: 'Lesson questions',
          lede: 'Every lesson question on your courses, unanswered first. Answers appear in the lesson thread.',
          open: 'unanswered',
          empty: 'No lesson questions yet.',
          emptyCourses: 'Publish a course to start collecting questions.',
          answer: 'Your answer',
          send: 'Post answer',
          saved: 'Answer posted.',
          answered: 'Answered',
        }
      : {
          back: '← স্টুডিওতে ফিরুন',
          eyebrow: 'স্টুডিও',
          title: 'পাঠের প্রশ্ন',
          lede: 'আপনার কোর্সের সব পাঠ-প্রশ্ন, উত্তর না দেওয়াগুলো আগে। উত্তর পাঠের আলোচনায় দেখা যাবে।',
          open: 'উত্তর বাকি',
          empty: 'এখনো কোনো পাঠ-প্রশ্ন নেই।',
          emptyCourses: 'প্রশ্ন পেতে আগে একটি কোর্স প্রকাশ করুন।',
          answer: 'আপনার উত্তর',
          send: 'উত্তর দিন',
          saved: 'উত্তর যোগ হয়েছে।',
          answered: 'উত্তর দেওয়া',
        };

  return (
    <div className={styles.page}>
      <div className="container">
        <Link href="/studio" className={styles.back}>
          {copy.back}
        </Link>
        <p className={styles.eyebrow}>{copy.eyebrow}</p>
        <h1 className={styles.title}>{copy.title}</h1>
        <p className={styles.lede}>{copy.lede}</p>
        {error ? <Alert tone="error">{error}</Alert> : null}
        {saved ? <Alert tone="success">{copy.saved}</Alert> : null}

        <p className={styles.meta}>
          <strong>{desk.unanswered}</strong> {copy.open}
        </p>

        {desk.courses.length === 0 ? <p className={styles.empty}>{copy.emptyCourses}</p> : null}
        {desk.courses.length > 0 && desk.questions.length === 0 ? <p className={styles.empty}>{copy.empty}</p> : null}

        <ul className={styles.reviewList}>
          {desk.questions.map((question) => (
            <li key={question.id} className={styles.reviewCard}>
              <p className={styles.meta}>
                {question.courseTitle[locale === 'en' ? 'en' : 'bn'] ?? question.courseTitle.en ?? ''} ·{' '}
                {question.lessonTitle[locale === 'en' ? 'en' : 'bn'] ?? question.lessonTitle.en ?? ''} · {question.author} ·{' '}
                {new Date(question.createdAt).toLocaleDateString(locale)}
              </p>
              <p>{question.body}</p>
              {question.answers.map((answer) => (
                <div key={`${question.id}-${answer.createdAt}`} className={styles.reply}>
                  <strong>{answer.author}</strong>
                  <p>{answer.body}</p>
                </div>
              ))}
              {question.answered ? <Badge tone="success">{copy.answered}</Badge> : null}
              <form action={answerStudioQuestionAction} className={styles.replyForm}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="questionId" value={question.id} />
                <label htmlFor={`answer-${question.id}`} className={styles.textareaLabel}>
                  {copy.answer}
                </label>
                <textarea
                  id={`answer-${question.id}`}
                  name="body"
                  className={styles.textarea}
                  rows={3}
                  maxLength={2000}
                  required
                />
                <Button type="submit" variant="secondary">
                  {copy.send}
                </Button>
              </form>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

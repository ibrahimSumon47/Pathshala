import { Bookmark, connectToDatabase, rememberLastLesson } from '@pathshala/db';
import type { Locale } from '@pathshala/shared';
import { notFound, redirect } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { Button, buttonStyles } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Link } from '@/i18n/navigation';
import { LessonPager } from '@/components/lesson-pager';
import { requireUser } from '@/lib/auth/guard';
import { getLearningCourse, getLessonNote, getLessonQuestions, getLessonQuiz } from '@/lib/learning';
import { sanitizeLessonHtml } from '@/lib/sanitize';
import {
  answerQuestionAction,
  askQuestionAction,
  markLessonAction,
  saveNoteAction,
  submitQuizAction,
  toggleBookmarkAction,
} from './actions';
import styles from './learn.module.css';

type LearnPageProps = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ lesson?: string; quiz?: string; error?: string }>;
};

const COPY = {
  bn: {
    back: 'কোর্সে ফিরুন',
    progress: 'অগ্রগতি',
    curriculum: 'পাঠক্রম',
    completed: 'সম্পন্ন',
    markComplete: 'পাঠ সম্পন্ন করুন',
    completedLabel: 'এই পাঠটি সম্পন্ন',
    attachments: 'সংযুক্তি',
    resources: 'কোর্সের ফাইল',
    bookmark: 'বুকমার্ক করুন',
    bookmarked: 'বুকমার্ক সরান',
    watchVideo: 'ভিডিও দেখুন',
    notes: 'আপনার নোট',
    notesHint: 'শুধু আপনি এই নোট দেখতে পাবেন।',
    saveNote: 'নোট সংরক্ষণ',
    questions: 'প্রশ্ন ও উত্তর',
    ask: 'প্রশ্ন করুন',
    reply: 'উত্তর দিন',
    answer: 'উত্তর',
    quiz: 'কুইজ',
    submitQuiz: 'উত্তর জমা দিন',
    passed: 'অভিনন্দন, কুইজে উত্তীর্ণ হয়েছেন।',
    failed: 'এবার হয়নি। উত্তরগুলো আবার দেখে আবার চেষ্টা করুন।',
    previous: 'আগের পাঠ',
    next: 'পরের পাঠ',
    pagerHint: 'Alt + ← / → দিয়ে পাঠ বদলান',
    lastScore: 'শেষ ফল',
    noQuestions: 'এই কুইজে এখনো প্রশ্ন নেই।',
    noLessons: 'এই কোর্সে এখনো পাঠ যোগ করা হয়নি।',
    error: 'কিছু একটা ঠিক হয়নি',
    reading: 'পাঠ',
    video: 'ভিডিও',
    questionPlaceholder: 'যেখানে আটকে গেছেন, সেটি লিখুন…',
    notePlaceholder: 'মনে রাখার মতো কথা…',
    replyPlaceholder: 'সংক্ষেপে উত্তর লিখুন…',
    review: 'আপনার শেষ চেষ্টা',
    yourAnswer: 'আপনার উত্তর',
    correctAnswer: 'সঠিক উত্তর',
    notAnswered: 'উত্তর দেওয়া হয়নি',
    why: 'ব্যাখ্যা',
  },
  en: {
    back: 'Back to course',
    progress: 'Progress',
    curriculum: 'Curriculum',
    completed: 'Completed',
    markComplete: 'Mark lesson complete',
    completedLabel: 'This lesson is complete',
    attachments: 'Attachments',
    resources: 'Course files',
    bookmark: 'Bookmark this lesson',
    bookmarked: 'Remove bookmark',
    watchVideo: 'Watch the video',
    notes: 'Your notes',
    notesHint: 'Only you can see this note.',
    saveNote: 'Save note',
    questions: 'Questions and answers',
    ask: 'Ask a question',
    reply: 'Reply',
    answer: 'Answer',
    quiz: 'Quiz',
    submitQuiz: 'Submit answers',
    passed: 'Passed. Nice work.',
    failed: 'Not this time. Review the answers and try again.',
    previous: 'Previous lesson',
    next: 'Next lesson',
    pagerHint: 'Alt + ← / → moves between lessons',
    lastScore: 'Last score',
    noQuestions: 'This quiz has no questions yet.',
    noLessons: 'This course has no lessons yet.',
    error: 'That did not work',
    reading: 'Reading',
    video: 'Video',
    questionPlaceholder: 'Describe where you got stuck…',
    notePlaceholder: 'Something worth remembering…',
    replyPlaceholder: 'Write a short reply…',
    review: 'Your last attempt',
    yourAnswer: 'Your answer',
    correctAnswer: 'Correct answer',
    notAnswered: 'Not answered',
    why: 'Why',
  },
} as const;

/** The learning room: curriculum, lesson, progress, quiz, notes and Q&A. */
export default async function LearnPage({ params, searchParams }: LearnPageProps) {
  const { locale, slug } = await params;
  const { lesson: lessonId, quiz: quizResult, error } = await searchParams;
  const language = (locale === 'en' ? 'en' : 'bn') as Locale;
  const user = await requireUser();
  const course = await getLearningCourse({ slug, userId: user.id, roles: user.roles });
  if (!course) notFound();
  if (!course.hasAccess) redirect(`${locale === 'en' ? '/en' : ''}/courses/${slug}`);
  if (course.lessons.length === 0) {
    return (
      <div className={styles.page}>
        <div className="container">
          <EmptyState title={COPY[language].noLessons} body={COPY[language].back} />
        </div>
      </div>
    );
  }

  const copy = COPY[language];
  const current =
    course.lessons.find((lesson) => lesson.id === lessonId) ??
    course.lessons.find((lesson) => !course.completedLessonIds.includes(lesson.id)) ??
    course.lessons[0];
  if (!current) notFound();
  const completed = course.completedLessonIds.includes(current.id);
  const flatLessons = course.sections.flatMap((section) => section.lessons);
  const currentIndex = flatLessons.findIndex((lesson) => lesson.id === current.id);
  const previousLesson = currentIndex > 0 ? flatLessons[currentIndex - 1] : undefined;
  const nextLesson = currentIndex >= 0 && currentIndex < flatLessons.length - 1 ? flatLessons[currentIndex + 1] : undefined;
  const lessonHref = (id: string) => `/learn/${slug}?lesson=${id}`;
  const lessonLabel = (lesson: (typeof flatLessons)[number]) => lesson.title[language] || lesson.title.en || lesson.title.bn;

  const [quiz, note, questions, bookmark] = await Promise.all([
    current.type === 'quiz'
      ? getLessonQuiz(current.id, user.id)
      : Promise.resolve({ questions: [], lastAttempt: null, review: null }),
    getLessonNote(current.id, user.id),
    getLessonQuestions(current.id),
    (async () => {
      await connectToDatabase();
      return Bookmark.exists({ student: user.id, lesson: current.id });
    })(),
  ]);
  // Remember where the reader stopped; a failure here must never block the lesson.
  await rememberLastLesson(user.id, course.id, current.id).catch(() => undefined);
  const resources = course.lessons.flatMap((lesson) =>
    lesson.attachments.map((attachment) => ({ ...attachment, lessonTitle: lesson.title, lessonId: lesson.id })),
  );

  return (
    <div className={styles.page}>
      <div className="container">
        <Link href={`/courses/${slug}`} className={styles.back}>
          ← {copy.back}
        </Link>
        <div className={styles.courseHead}>
          <h1 className={styles.courseTitle}>{course.title[language] || course.title.en || course.title.bn}</h1>
          <div className={styles.progressWrap}>
            <span className={styles.progressLabel}>
              {copy.progress} · {course.progressPercent}%
            </span>
            <div className={styles.progressTrack} role="progressbar" aria-valuenow={course.progressPercent} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${course.progressPercent}%` }} />
            </div>
          </div>
        </div>
        {error ? <Alert tone="error">{error}</Alert> : null}

        <div className={styles.layout}>
          <aside className={styles.sidebar} aria-label={copy.curriculum}>
            {course.sections.map((section) => (
              <div key={section.id} className={styles.section}>
                <h2 className={styles.sectionTitle}>{section.title[language] || section.title.en || section.title.bn}</h2>
                <ul className={styles.lessonList}>
                  {section.lessons.map((lesson) => {
                    const done = course.completedLessonIds.includes(lesson.id);
                    return (
                      <li key={lesson.id}>
                        <Link
                          href={`/learn/${slug}?lesson=${lesson.id}`}
                          className={lesson.id === current.id ? styles.lessonActive : styles.lesson}
                          aria-current={lesson.id === current.id ? 'page' : undefined}
                        >
                          <span className={styles.lessonName}>
                            {done ? <span aria-label={copy.completed}>✓ </span> : null}
                            {lesson.title[language] || lesson.title.en || lesson.title.bn}
                          </span>
                          <span className={styles.lessonType}>{copy[lesson.type]}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </aside>

          <article className={styles.content}>
            <div className={styles.lessonHead}>
              <Badge tone={current.type === 'quiz' ? 'warning' : 'neutral'}>{copy[current.type]}</Badge>
              <h2 className={styles.lessonTitle}>{current.title[language] || current.title.en || current.title.bn}</h2>
            </div>

            {current.videoUrl ? (
              <a href={current.videoUrl} className={buttonStyles({ variant: 'secondary' })} target="_blank" rel="noopener noreferrer">
                {copy.watchVideo}
              </a>
            ) : null}

            {current.bodyHtml ? (
              <div className={styles.body} dangerouslySetInnerHTML={{ __html: sanitizeLessonHtml(current.bodyHtml) }} />
            ) : null}

            {current.attachments.length > 0 ? (
              <section className={styles.block}>
                <h3>{copy.attachments}</h3>
                <ul className={styles.attachments}>
                  {current.attachments.map((attachment) => (
                    <li key={attachment.url}>
                      <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                        {attachment.name}
                      </a>
                      <span>{Math.round(attachment.sizeBytes / 1024)} KB</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {current.type === 'quiz' ? (
              <Card className={styles.block}>
                <h3>{copy.quiz}</h3>
                {quiz.lastAttempt ? (
                  <Alert tone={quiz.lastAttempt.passed ? 'success' : 'error'}>
                    {copy.lastScore}: {quiz.lastAttempt.score}/{quiz.lastAttempt.maxScore}
                  </Alert>
                ) : null}
                {quizResult === 'passed' ? <Alert tone="success">{copy.passed}</Alert> : null}
                {quizResult === 'failed' ? <Alert tone="error">{copy.failed}</Alert> : null}
                {quiz.questions.length === 0 ? (
                  <p className={styles.muted}>{copy.noQuestions}</p>
                ) : (
                  <form action={submitQuizAction} className={styles.form}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="courseId" value={course.id} />
                    <input type="hidden" name="lessonId" value={current.id} />
                    <input type="hidden" name="slug" value={slug} />
                    {quiz.questions.map((question) => (
                      <fieldset key={question.id} className={styles.question}>
                        <legend>{question.prompt}</legend>
                        {question.options.map((option, index) => (
                          <label key={`${question.id}-${index}`} className={styles.option}>
                            <input
                              type={question.type === 'multiple' ? 'checkbox' : 'radio'}
                              name={`q_${question.id}`}
                              value={index}
                            />
                            <span>{option}</span>
                          </label>
                        ))}
                      </fieldset>
                    ))}
                    <Button type="submit">{copy.submitQuiz}</Button>
                  </form>
                )}
                {quiz.review ? (
                  <div>
                    <h4>{copy.review}</h4>
                    <ul className={styles.questions}>
                      {quiz.review.map((row, index) => (
                        <li key={`${row.prompt}-${index}`} className={styles.questionItem}>
                          <p className={styles.questionBody}>
                            {row.earned ? '✓ ' : '· '}
                            {row.prompt}
                          </p>
                          <p className={styles.muted}>
                            {copy.yourAnswer}:{' '}
                            {row.selected.length > 0
                              ? row.selected.map((option) => row.options[option] ?? '').join(', ')
                              : copy.notAnswered}
                          </p>
                          <p className={styles.muted}>
                            {copy.correctAnswer}:{' '}
                            {row.correctIndexes.map((option) => row.options[option] ?? '').join(', ')}
                          </p>
                          {row.explanation ? (
                            <p>
                              {copy.why}: {row.explanation}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </Card>
            ) : null}

            <div className={styles.completeForm}>
              <form action={markLessonAction}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="courseId" value={course.id} />
                <input type="hidden" name="lessonId" value={current.id} />
                <input type="hidden" name="slug" value={slug} />
                <Button type="submit" variant={completed ? 'secondary' : 'primary'}>
                  {completed ? copy.completedLabel : copy.markComplete}
                </Button>
              </form>
              <form action={toggleBookmarkAction}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="courseId" value={course.id} />
                <input type="hidden" name="lessonId" value={current.id} />
                <input type="hidden" name="slug" value={slug} />
                <Button type="submit" variant="ghost">
                  {bookmark ? copy.bookmarked : copy.bookmark}
                </Button>
              </form>
            </div>

            <LessonPager
              previous={previousLesson ? { href: lessonHref(previousLesson.id), label: `${copy.previous}: ${lessonLabel(previousLesson)}` } : null}
              next={nextLesson ? { href: lessonHref(nextLesson.id), label: `${copy.next}: ${lessonLabel(nextLesson)}` } : null}
              hint={copy.pagerHint}
            />

            <section className={styles.block}>
              <h3>{copy.notes}</h3>
              <p className={styles.muted}>{copy.notesHint}</p>
              <form action={saveNoteAction} className={styles.form}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="courseId" value={course.id} />
                <input type="hidden" name="lessonId" value={current.id} />
                <input type="hidden" name="slug" value={slug} />
                <textarea
                  name="body"
                  className={styles.textarea}
                  rows={5}
                  defaultValue={note?.body ?? ''}
                  placeholder={copy.notePlaceholder}
                  maxLength={4000}
                />
                <Button type="submit" variant="secondary">
                  {copy.saveNote}
                </Button>
              </form>
            </section>

            {resources.length > 0 ? (
              <section className={styles.block}>
                <h3>{copy.resources}</h3>
                <ul className={styles.attachments}>
                  {resources.map((resource) => (
                    <li key={`${resource.lessonId}-${resource.url}`}>
                      <a href={resource.url} target="_blank" rel="noopener noreferrer">
                        {resource.name}
                      </a>
                      <span>
                        {Math.round(resource.sizeBytes / 1024)} KB · {resource.lessonTitle[language] ?? ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section id="questions" className={styles.block}>
              <h3>{copy.questions}</h3>
              <form action={askQuestionAction} className={styles.form}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="courseId" value={course.id} />
                <input type="hidden" name="lessonId" value={current.id} />
                <input type="hidden" name="slug" value={slug} />
                <textarea name="body" className={styles.textarea} rows={3} placeholder={copy.questionPlaceholder} maxLength={2000} required />
                <Button type="submit" variant="secondary">
                  {copy.ask}
                </Button>
              </form>
              <ul className={styles.questions}>
                {questions.map((question) => (
                  <li key={question.id} className={styles.questionItem}>
                    <p className={styles.questionBody}>{question.body}</p>
                    <p className={styles.muted}>
                      {question.author} · {new Date(question.createdAt).toLocaleDateString(locale)}
                    </p>
                    {question.answers.map((answer) => (
                      <div key={`${question.id}-${answer.createdAt}`} className={styles.answer}>
                        <p>{answer.body}</p>
                        <p className={styles.muted}>
                          {answer.author} · {new Date(answer.createdAt).toLocaleDateString(locale)}
                        </p>
                      </div>
                    ))}
                    <details>
                      <summary>{copy.reply}</summary>
                      <form action={answerQuestionAction} className={styles.form}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="questionId" value={question.id} />
                        <input type="hidden" name="lessonId" value={current.id} />
                        <input type="hidden" name="slug" value={slug} />
                        <textarea name="body" className={styles.textarea} rows={2} placeholder={copy.replyPlaceholder} maxLength={2000} required />
                        <Button type="submit" variant="secondary" size="sm">
                          {copy.answer}
                        </Button>
                      </form>
                    </details>
                  </li>
                ))}
              </ul>
            </section>
          </article>
        </div>
      </div>
    </div>
  );
}

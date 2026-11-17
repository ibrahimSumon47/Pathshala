import { notFound } from 'next/navigation';
import { listQuestionBank } from '@pathshala/db';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { Link } from '@/i18n/navigation';
import { requireRole } from '@/lib/auth/guard';
import { getStudioQuiz } from '@/lib/studio';
import { addBankQuestionAction, addQuizQuestionAction, saveQuestionToBankAction } from '../../../actions';
import styles from './quiz.module.css';

type QuizBuilderProps = {
  params: Promise<{ locale: string; id: string; lessonId: string }>;
  searchParams: Promise<{ error?: string; saved?: string; bank?: string }>;
};

/** Instructor quiz builder: add single, multiple or true/false questions. */
export default async function QuizBuilderPage({ params, searchParams }: QuizBuilderProps) {
  const { locale, id, lessonId } = await params;
  const { error, saved, bank } = await searchParams;
  const user = await requireRole('instructor', 'admin');
  const quiz = await getStudioQuiz(id, lessonId, user.id, user.roles.includes('admin'));
  if (!quiz) notFound();
  const language = locale === 'en' ? 'en' : 'bn';
  const bankQuestions = await listQuestionBank(user.id);
  const bankMessage = {
    saved: language === 'en' ? 'Saved to the question bank.' : 'প্রশ্নের ভাণ্ডারে সংরক্ষিত হয়েছে।',
    exists: language === 'en' ? 'That question is already in your bank.' : 'এই প্রশ্নটি আগেই ভাণ্ডারে আছে।',
    added: language === 'en' ? 'Added to this quiz.' : 'এই কুইজে যোগ হয়েছে।',
    duplicate: language === 'en' ? 'That question is already in this quiz.' : 'এই প্রশ্নটি ইতিমধ্যে কুইজে আছে।',
  } as const;
  const bankNote = bank === 'saved' || bank === 'exists' || bank === 'added' || bank === 'duplicate' ? bankMessage[bank] : null;

  return (
    <div className={styles.page}>
      <div className="container">
        <Link href={`/studio/${id}`} className={styles.back}>
          ← {language === 'en' ? 'Back to course' : 'কোর্সে ফিরুন'}
        </Link>
        <p className={styles.eyebrow}>{language === 'en' ? 'Quiz builder' : 'কুইজ তৈরি'}</p>
        <h1 className={styles.title}>{quiz.lessonTitle[language] || quiz.lessonTitle.en || quiz.lessonTitle.bn}</h1>
        <p className={styles.lede}>
          {language === 'en'
            ? 'Questions are scored on the server. Mark the correct option numbers, starting at 0.'
            : 'প্রশ্নের নম্বর সার্ভারে হিসাব হয়। সঠিক উত্তরের নম্বর ০ থেকে শুরু করে লিখুন।'}
        </p>
        {error ? <Alert tone="error">{error}</Alert> : null}
        {saved ? <Alert tone="success">{language === 'en' ? 'Question added.' : 'প্রশ্ন যোগ হয়েছে।'}</Alert> : null}
        {bankNote ? <Alert tone="success">{bankNote}</Alert> : null}

        <section className={styles.list}>
          <h2>{language === 'en' ? 'Questions' : 'প্রশ্নসমূহ'} · {quiz.questions.length}</h2>
          {quiz.questions.length === 0 ? (
            <p className={styles.muted}>{language === 'en' ? 'No questions yet.' : 'এখনো কোনো প্রশ্ন নেই।'}</p>
          ) : null}
          <ol>
            {quiz.questions.map((question) => (
              <li key={question.id} className={styles.question}>
                <p className={styles.prompt}>{question.prompt}</p>
                <Badge>{question.type}</Badge>
                <span className={styles.points}>{question.points} pt</span>
                <ul>
                  {question.options.map((option, index) => (
                    <li key={`${question.id}-${index}`}>
                      {question.correctIndexes.includes(index) ? '✓ ' : ''}
                      {option}
                    </li>
                  ))}
                </ul>
                {question.explanation ? (
                  <p className={styles.muted}>
                    {language === 'en' ? 'Explanation' : 'ব্যাখ্যা'}: {question.explanation}
                  </p>
                ) : null}
                <form action={saveQuestionToBankAction}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="courseId" value={id} />
                  <input type="hidden" name="lessonId" value={lessonId} />
                  <input type="hidden" name="questionId" value={question.id} />
                  <Button type="submit" variant="secondary" size="sm">
                    {language === 'en' ? 'Save to question bank' : 'প্রশ্নের ভাণ্ডারে রাখুন'}
                  </Button>
                </form>
              </li>
            ))}
          </ol>
        </section>

        <form action={addQuizQuestionAction} className={styles.form}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="courseId" value={id} />
          <input type="hidden" name="lessonId" value={lessonId} />
          <Field id="prompt" name="prompt" label={language === 'en' ? 'Question' : 'প্রশ্ন'} required minLength={4} maxLength={500} />
          <div className={styles.two}>
            <Select
              id="type"
              name="type"
              label={language === 'en' ? 'Type' : 'ধরন'}
              defaultValue="single"
              options={[
                { value: 'single', label: language === 'en' ? 'Single choice' : 'একটি উত্তর' },
                { value: 'multiple', label: language === 'en' ? 'Multiple choice' : 'একাধিক উত্তর' },
                { value: 'true-false', label: language === 'en' ? 'True / false' : 'সত্য / মিথ্যা' },
              ]}
            />
            <Field id="correct" name="correct" label={language === 'en' ? 'Correct option numbers' : 'সঠিক উত্তরের নম্বর'} defaultValue="0" hint="0,1" />
            <Field id="points" name="points" type="number" min={1} max={10} defaultValue={1} label={language === 'en' ? 'Points' : 'নম্বর'} />
          </div>
          <div className={styles.options}>
            {[0, 1, 2, 3].map((index) => (
              <Field
                key={index}
                id={`option${index}`}
                name={`option${index}`}
                label={`${language === 'en' ? 'Option' : 'বিকল্প'} ${index}`}
                maxLength={300}
              />
            ))}
          </div>
          <div>
            <label htmlFor="explanation" className={styles.prompt}>
              {language === 'en' ? 'Explanation (shown after the attempt)' : 'ব্যাখ্যা (উত্তর দেওয়ার পরে দেখা যাবে)'}
            </label>
            <textarea
              id="explanation"
              name="explanation"
              className={styles.textarea}
              rows={2}
              maxLength={500}
            />
          </div>
          <Button type="submit">{language === 'en' ? 'Add question' : 'প্রশ্ন যোগ করুন'}</Button>
        </form>

        <section className={styles.list} aria-labelledby="question-bank">
          <h2 id="question-bank">{language === 'en' ? 'Question bank' : 'প্রশ্নের ভাণ্ডার'}</h2>
          <p className={styles.muted}>
            {language === 'en'
              ? 'Reuse a question you saved earlier in another quiz on your courses.'
              : 'আগে সংরক্ষণ করা প্রশ্ন নিজের অন্য কুইজে আবার ব্যবহার করুন।'}
          </p>
          {bankQuestions.length === 0 ? (
            <p className={styles.muted}>
              {language === 'en' ? 'No saved questions yet.' : 'এখনো কোনো প্রশ্ন সংরক্ষিত নেই।'}
            </p>
          ) : (
            <div className={styles.bankList}>
              {bankQuestions.map((question) => (
                <div key={question.id} className={styles.question}>
                  <p className={styles.prompt}>{question.prompt}</p>
                  <Badge>{question.type}</Badge>
                  <span className={styles.points}>{question.points} pt</span>
                  <ul>
                    {question.options.map((option, index) => (
                      <li key={`${question.id}-${index}`}>
                        {question.correctIndexes.includes(index) ? '✓ ' : ''}
                        {option}
                      </li>
                    ))}
                  </ul>
                  {question.sourceCourseTitle ? (
                    <p className={styles.muted}>
                      {language === 'en' ? 'From' : 'থেকে'}:{' '}
                      {question.sourceCourseTitle[language] ?? question.sourceCourseTitle.en ?? question.sourceCourseTitle.bn}
                    </p>
                  ) : null}
                  <form action={addBankQuestionAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="courseId" value={id} />
                    <input type="hidden" name="lessonId" value={lessonId} />
                    <input type="hidden" name="bankItemId" value={question.id} />
                    <Button type="submit" variant="secondary" size="sm">
                      {language === 'en' ? 'Add to this quiz' : 'এই কুইজে যোগ করুন'}
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

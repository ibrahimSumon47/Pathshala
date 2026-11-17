import { notFound } from 'next/navigation';
import { getCourseRoster } from '@pathshala/db';
import type { Locale } from '@pathshala/shared';
import { Badge } from '@/components/ui/badge';
import { Link } from '@/i18n/navigation';
import { requireRole } from '@/lib/auth/guard';
import styles from '../../studio.module.css';

type RosterPageProps = {
  params: Promise<{ locale: string; id: string }>;
};

const COPY = {
  bn: {
    back: '← কোর্সে ফিরুন',
    eyebrow: 'স্টুডিও',
    title: 'শিক্ষার্থী তালিকা',
    lede: 'কে কোর্সে আছে, কতটা এগিয়েছে আর সার্টিফিকেট পেয়েছে—এক জায়গায়।',
    empty: 'এখনো কেউ এই কোর্সে নামেনি।',
    learner: 'শিক্ষার্থী',
    progress: 'অগ্রগতি',
    status: 'অবস্থা',
    enrolled: 'শুরু',
    completed: 'সম্পন্ন',
    certificate: 'সার্টিফিকেট',
    survey: 'সমীক্ষা',
    yes: 'হ্যাঁ',
    no: 'না',
    view: 'দেখুন',
    students: 'শিক্ষার্থী',
    finished: 'সম্পন্ন',
    average: 'গড় অগ্রগতি',
    responses: 'সমীক্ষার উত্তর',
    feedback: 'সমীক্ষার গড় (১–৫)',
    difficulty: 'কঠিনতা',
    pace: 'গতি',
    confidence: 'আত্মবিশ্বাস',
    noSurveys: 'এখনো কোনো সমীক্ষার উত্তর আসেনি।',
  },
  en: {
    back: '← Back to course',
    eyebrow: 'Studio',
    title: 'Student roster',
    lede: 'Who is enrolled, how far they have come, and who earned a certificate.',
    empty: 'Nobody has enrolled in this course yet.',
    learner: 'Learner',
    progress: 'Progress',
    status: 'Status',
    enrolled: 'Started',
    completed: 'Completed',
    certificate: 'Certificate',
    survey: 'Survey',
    yes: 'Yes',
    no: 'No',
    view: 'View',
    students: 'Learners',
    finished: 'Completed',
    average: 'Average progress',
    responses: 'Survey answers',
    feedback: 'Survey averages (1–5)',
    difficulty: 'Difficulty',
    pace: 'Pace',
    confidence: 'Confidence',
    noSurveys: 'No survey answers yet.',
  },
} as const;

/** One course's class list with progress, certificates and anonymous survey averages. */
export default async function StudioRosterPage({ params }: RosterPageProps) {
  const { locale, id } = await params;
  const language = (locale === 'en' ? 'en' : 'bn') as Locale;
  const copy = COPY[language];
  const user = await requireRole('instructor', 'admin');
  const roster = await getCourseRoster(id, user.id, user.roles.includes('admin'));
  if (!roster) notFound();
  const courseTitle = roster.courseTitle[language] ?? roster.courseTitle.en ?? roster.courseTitle.bn ?? '';

  return (
    <div className={styles.page}>
      <div className="container">
        <Link href={`/studio/${id}`} className={styles.back}>
          {copy.back}
        </Link>
        <p className={styles.eyebrow}>{copy.eyebrow}</p>
        <h1 className={styles.title}>
          {copy.title} · {courseTitle}
        </h1>
        <p className={styles.lede}>{copy.lede}</p>

        <section className={styles.statGrid} aria-label={copy.title}>
          <div className={styles.stat}>
            <p className={styles.statLabel}>{copy.students}</p>
            <p className={styles.statValue}>{roster.total}</p>
          </div>
          <div className={styles.stat}>
            <p className={styles.statLabel}>{copy.finished}</p>
            <p className={styles.statValue}>{roster.completed}</p>
          </div>
          <div className={styles.stat}>
            <p className={styles.statLabel}>{copy.average}</p>
            <p className={styles.statValue}>{roster.averageProgress}%</p>
          </div>
          <div className={styles.stat}>
            <p className={styles.statLabel}>{copy.responses}</p>
            <p className={styles.statValue}>{roster.survey.count}</p>
          </div>
        </section>

        <section className={styles.panel} aria-labelledby="survey-averages">
          <h2 id="survey-averages" className={styles.sectionHeading}>
            {copy.feedback}
          </h2>
          {roster.survey.count === 0 ? (
            <p className={styles.empty}>{copy.noSurveys}</p>
          ) : (
            <div className={styles.statGrid}>
              <div className={styles.stat}>
                <p className={styles.statLabel}>{copy.difficulty}</p>
                <p className={styles.statValue}>{roster.survey.difficulty}</p>
              </div>
              <div className={styles.stat}>
                <p className={styles.statLabel}>{copy.pace}</p>
                <p className={styles.statValue}>{roster.survey.pace}</p>
              </div>
              <div className={styles.stat}>
                <p className={styles.statLabel}>{copy.confidence}</p>
                <p className={styles.statValue}>{roster.survey.confidence}</p>
              </div>
            </div>
          )}
        </section>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">{copy.learner}</th>
                <th scope="col">{copy.progress}</th>
                <th scope="col">{copy.status}</th>
                <th scope="col">{copy.enrolled}</th>
                <th scope="col">{copy.completed}</th>
                <th scope="col">{copy.certificate}</th>
                <th scope="col">{copy.survey}</th>
              </tr>
            </thead>
            <tbody>
              {roster.students.map((student) => (
                <tr key={student.id}>
                  <td>
                    {student.name}
                    <br />
                    <span className={styles.email}>{student.email}</span>
                  </td>
                  <td className={styles.num}>{student.progressPercent}%</td>
                  <td>
                    <Badge tone={student.status === 'completed' ? 'success' : 'neutral'}>{student.status}</Badge>
                  </td>
                  <td>{new Date(student.enrolledAt).toLocaleDateString(locale)}</td>
                  <td>{student.completedAt ? new Date(student.completedAt).toLocaleDateString(locale) : '—'}</td>
                  <td>
                    {student.certificateCode ? (
                      <Link href={`/verify/${student.certificateCode}`}>{copy.view}</Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{student.surveySubmitted ? copy.yes : copy.no}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {roster.students.length === 0 ? <p className={styles.empty}>{copy.empty}</p> : null}
        </div>
      </div>
    </div>
  );
}

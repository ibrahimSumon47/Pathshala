import { getWaitlistPosition, hasCheckedIn, jitsiUrl, listCourseSessions } from '@pathshala/db';
import { getLearningCourse } from '@/lib/learning';
import { type Locale } from '@pathshala/shared';
import { notFound, redirect } from 'next/navigation';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button, buttonStyles } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Link } from '@/i18n/navigation';
import { requireUser } from '@/lib/auth/guard';
import { checkInAction } from './actions';
import styles from './live.module.css';

type LivePageProps = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ checked?: string; waitlisted?: string; error?: string; session?: string }>;
};

const COPY = {
  bn: {
    back: 'কোর্সে ফিরুন',
    live: 'লাইভ ক্লাস',
    upcoming: 'আসন্ন ক্লাস',
    room: 'ক্লাস রুম',
    join: 'ক্লাসে যোগ দিন',
    checked: 'উপস্থিতি নেওয়া হয়েছে।',
    checkIn: 'উপস্থিতি নিশ্চিত করুন',
    attended: 'আপনি উপস্থিত আছেন',
    calendar: 'ক্যালেন্ডারে যোগ করুন (.ics)',
    noSessions: 'এখনো কোনো লাইভ ক্লাস নেই।',
    past: 'আগের ক্লাস',
    attendance: 'জন উপস্থিত',
    onWaitlist: 'অপেক্ষার তালিকায় · #',
    waiting: 'জন অপেক্ষায়',
    joinWaitlist: 'অপেক্ষার তালিকায় যোগ দিন',
    claimSeat: 'আসনটি নিন',
    waitlistedNotice: (position: string) => `রুম পূর্ণ। আপনি অপেক্ষার তালিকায় #${position} নম্বরে আছেন।`,
    seats: 'আসন',
    error: 'উপস্থিতি নেওয়া যায়নি',
    jitsiNote: 'রুম নতুন ট্যাবে না খুললে নিচের লিংক ব্যবহার করুন।',
    minutes: 'মিনিট',
  },
  en: {
    back: 'Back to course',
    live: 'Live classes',
    upcoming: 'Upcoming classes',
    room: 'Class room',
    join: 'Join the class',
    checked: 'Attendance recorded.',
    checkIn: 'Confirm attendance',
    attended: 'You are marked present',
    calendar: 'Add to calendar (.ics)',
    noSessions: 'No live classes scheduled yet.',
    past: 'Past classes',
    attendance: 'attending',
    onWaitlist: 'On the waitlist · #',
    waiting: 'waiting',
    joinWaitlist: 'Join the waitlist',
    claimSeat: 'Claim your seat',
    waitlistedNotice: (position: string) => `The room is full. You are #${position} on the waitlist.`,
    seats: 'seats',
    error: 'Attendance could not be recorded',
    jitsiNote: 'If the room does not open, use the new-tab link below.',
    minutes: 'minutes',
  },
} as const;

/** Course live room: next class embed, schedule, attendance and calendar download. */
export default async function LivePage({ params, searchParams }: LivePageProps) {
  const { locale, slug } = await params;
  const { checked, waitlisted, error, session: sessionParam } = await searchParams;
  const language = (locale === 'en' ? 'en' : 'bn') as Locale;
  const copy = COPY[language];
  const user = await requireUser();
  const course = await getLearningCourse({ slug, userId: user.id, roles: user.roles });
  if (!course) notFound();
  if (!course.hasAccess) redirect(`${locale === 'en' ? '/en' : ''}/courses/${slug}`);
  const [upcoming, past] = await Promise.all([
    listCourseSessions(course.id, 'upcoming'),
    listCourseSessions(course.id, 'past'),
  ]);
  const sessions = [...upcoming, ...past];
  // A seat note names the exact session; fall back to the next class if it is gone.
  const next = upcoming.find((session) => session.id === sessionParam) ?? upcoming[0] ?? null;
  const checkedIn = next ? await hasCheckedIn(next.id, user.id) : false;
  const waitlistPosition = next ? await getWaitlistPosition(next.id, user.id) : null;
  const seatsFull = Boolean(next && next.capacity > 0 && next.attendanceCount >= next.capacity);

  return (
    <div className={styles.page}>
      <div className="container">
        <Link href={`/courses/${slug}`} className={styles.back}>
          ← {copy.back}
        </Link>
        <p className={styles.eyebrow}>{copy.live}</p>
        <h1>{course.title[language] || course.title.en || course.title.bn}</h1>
        {error ? <Alert tone="error">{copy.error}: {error}</Alert> : null}
        {checked ? <Alert tone="success">{copy.checked}</Alert> : null}
        {waitlisted ? <Alert tone="success">{copy.waitlistedNotice(waitlisted)}</Alert> : null}

        {sessions.length === 0 ? (
          <EmptyState title={copy.noSessions} body={copy.live} />
        ) : (
          <div className={styles.layout}>
            <div className={styles.stack}>
              {next ? (
                <Card className={styles.room}>
                  <div className={styles.roomHead}>
                    <div>
                      <Badge tone="accent">{copy.room}</Badge>
                      <h2>{next.title[language] || next.title.en || next.title.bn}</h2>
                      <p className={styles.meta}>
                        {new Date(next.startsAt).toLocaleString(locale)} · {next.durationMinutes} {copy.minutes} · {next.attendanceCount}
                        {next.capacity > 0 ? `/${next.capacity} ${copy.seats}` : ''} {copy.attendance}
                        {next.waitlistCount > 0 ? ` · ${next.waitlistCount} ${copy.waiting}` : ''}
                      </p>
                    </div>
                    <a href={jitsiUrl(next.roomName)} target="_blank" rel="noopener noreferrer" className={buttonStyles({ variant: 'secondary' })}>
                      {copy.join}
                    </a>
                  </div>
                  <iframe
                    src={jitsiUrl(next.roomName)}
                    title={`${copy.room}: ${next.title[language] || next.title.en || next.title.bn}`}
                    className={styles.embed}
                    allow="camera; microphone; fullscreen; display-capture; autoplay"
                  />
                  <p className={styles.hint}>{copy.jitsiNote}</p>
                  <div className={styles.actions}>
                    <form action={checkInAction}>
                      <input type="hidden" name="sessionId" value={next.id} />
                      <input type="hidden" name="slug" value={slug} />
                      <Button
                        type="submit"
                        variant={checkedIn || (waitlistPosition && seatsFull) ? 'secondary' : 'primary'}
                        disabled={checkedIn || Boolean(waitlistPosition && seatsFull)}
                      >
                        {checkedIn
                          ? copy.attended
                          : waitlistPosition
                            ? seatsFull
                              ? `${copy.onWaitlist}${waitlistPosition}`
                              : copy.claimSeat
                            : seatsFull
                              ? copy.joinWaitlist
                              : copy.checkIn}
                      </Button>
                    </form>
                    <a href={`/api/sessions/${next.id}/calendar`} className={buttonStyles({ variant: 'secondary' })}>
                      {copy.calendar}
                    </a>
                  </div>
                </Card>
              ) : null}

              <Card className={styles.list}>
                <h2>{copy.upcoming}</h2>
                {upcoming.length === 0 ? <p className={styles.hint}>{copy.noSessions}</p> : null}
                <ul>
                  {upcoming.map((session) => (
                    <li key={session.id}>
                      <div>
                        <p className={styles.itemTitle}>{session.title[language] || session.title.en || session.title.bn}</p>
                        <p className={styles.meta}>
                          {new Date(session.startsAt).toLocaleString(locale)} · {session.durationMinutes} {copy.minutes}
                          {session.capacity > 0 ? ` · ${session.attendanceCount}/${session.capacity} ${copy.seats}` : ''}
                        </p>
                      </div>
                      <a href={`/api/sessions/${session.id}/calendar`} className={styles.calendarLink}>
                        {copy.calendar}
                      </a>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            <aside className={styles.side}>
              <Card className={styles.list}>
                <h2>{copy.past}</h2>
                <ul>
                  {past.map((session) => (
                    <li key={session.id}>
                      <div>
                        <p className={styles.itemTitle}>{session.title[language] || session.title.en || session.title.bn}</p>
                        <p className={styles.meta}>
                          {new Date(session.startsAt).toLocaleDateString(locale)} · {session.attendanceCount} {copy.attendance}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

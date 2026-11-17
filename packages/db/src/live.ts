import { randomUUID } from 'node:crypto';
import { MinHeap } from '@pathshala/shared';
import type { Types } from 'mongoose';
import { connectToDatabase } from './connection';
import { Attendance, type AttendanceDoc } from './models/attendance';
import { Course } from './models/course';
import { Enrolment } from './models/enrolment';
import { LiveSession, type LiveSessionDoc } from './models/live-session';
import { Notification } from './models/notification';
import { Reminder, type ReminderDoc } from './models/reminder';
import { User } from './models/user';

type Doc<T> = T & { _id: Types.ObjectId };

export type LiveSessionView = {
  id: string;
  courseId: string;
  courseSlug: string;
  title: { bn?: string; en?: string };
  description: { bn?: string; en?: string };
  startsAt: string;
  durationMinutes: number;
  roomName: string;
  status: string;
  attendanceCount: number;
};

export type AttendanceView = { studentName: string; joinedAt: string };
export type NotificationView = {
  id: string;
  title: { bn?: string; en?: string };
  body: { bn?: string; en?: string };
  href: string;
  readAt: string | null;
  createdAt: string;
};

/** Jitsi room names are unguessable enough and stable for the session's lifetime. */
export function jitsiRoomFor(sessionId: string): string {
  return `pathshala-${sessionId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)}`;
}

/** Jitsi URL used by the embed and the new-tab fallback. */
export function jitsiUrl(roomName: string): string {
  return `https://meet.jit.si/${encodeURIComponent(roomName)}`;
}

/** Map a session to the safe shape the web pages render. */
function toView(session: Doc<LiveSessionDoc>, attendanceCount = 0): LiveSessionView {
  return {
    id: String(session._id),
    courseId: String(session.course),
    courseSlug: '',
    title: session.title,
    description: session.description,
    startsAt: session.startsAt.toISOString(),
    durationMinutes: session.durationMinutes,
    roomName: session.roomName,
    status: session.status,
    attendanceCount,
  };
}

/** Instructor creates a scheduled room; the room name is generated once. */
export async function createLiveSession(input: {
  courseId: string;
  instructorId: string;
  title: { bn?: string; en?: string };
  description: { bn?: string; en?: string };
  startsAt: Date;
  durationMinutes: number;
}): Promise<LiveSessionView> {
  await connectToDatabase();
  const session = await LiveSession.create({
    course: input.courseId,
    instructor: input.instructorId,
    title: input.title,
    description: input.description,
    startsAt: input.startsAt,
    durationMinutes: input.durationMinutes,
    roomName: jitsiRoomFor(randomUUID()),
    status: 'scheduled',
  });
  return toView(session.toObject() as Doc<LiveSessionDoc>);
}

/** Sessions for one course in the past, upcoming or both; cancelled rooms are hidden. */
export async function listCourseSessions(
  courseId: string,
  window: 'all' | 'upcoming' | 'past' = 'all',
): Promise<LiveSessionView[]> {
  await connectToDatabase();
  const query: Record<string, unknown> = { course: courseId, status: { $ne: 'cancelled' } };
  const now = new Date();
  if (window === 'upcoming') query.startsAt = { $gte: now };
  if (window === 'past') query.startsAt = { $lt: now };
  const sessions = await LiveSession.find(query)
    .sort({ startsAt: window === 'past' ? -1 : 1 })
    .limit(30)
    .lean();
  const counts = await Attendance.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { session: { $in: sessions.map((session) => session._id) } } },
    { $group: { _id: '$session', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((row) => [String(row._id), row.count]));
  return sessions.map((session) => ({ ...toView(session as Doc<LiveSessionDoc>), attendanceCount: countMap.get(String(session._id)) ?? 0 }));
}

/** Load one session and prove the viewer may enter its course. */
export async function getSessionForViewer(
  sessionId: string,
  userId: string,
  roles: string[],
): Promise<{ session: LiveSessionView; courseTitle: { bn?: string; en?: string }; courseSlug: string } | null> {
  await connectToDatabase();
  const session = await LiveSession.findById(sessionId).lean();
  if (!session) return null;
  const course = await Course.findById(session.course).select('title slug instructor').lean();
  if (!course) return null;
  const isStaff = roles.includes('admin') || String(course.instructor) === userId;
  if (!isStaff) {
    const enrolled = await Enrolment.exists({ student: userId, course: course._id, status: { $ne: 'refunded' } });
    if (!enrolled) return null;
  }
  return {
    session: { ...toView(session as Doc<LiveSessionDoc>), courseSlug: course.slug },
    courseTitle: course.title,
    courseSlug: course.slug,
  };
}

/** Create one in-app reminder per enrolled student, due an hour before the session. */
export async function scheduleSessionReminders(sessionId: string): Promise<number> {
  await connectToDatabase();
  const session = await LiveSession.findById(sessionId).lean();
  if (!session) return 0;
  const students = await Enrolment.find({ course: session.course, status: { $ne: 'refunded' } }).select('student').lean();
  if (students.length === 0) return 0;
  const dueAt = new Date(session.startsAt.getTime() - 60 * 60 * 1000);
  await Reminder.bulkWrite(
    students.map(({ student }) => ({
      updateOne: {
        filter: { session: session._id, student, channel: 'in_app' },
        update: { $setOnInsert: { dueAt, status: 'pending', sentAt: null, error: null } },
        upsert: true,
      },
    })),
  );
  return students.length;
}

/** An enrollee gets reminders for every already-scheduled future session. */
export async function ensureRemindersForEnrolment(studentId: string, courseId: string): Promise<number> {
  await connectToDatabase();
  const sessions = await LiveSession.find({ course: courseId, startsAt: { $gte: new Date() }, status: 'scheduled' })
    .select('_id startsAt')
    .lean();
  if (sessions.length === 0) return 0;
  await Reminder.bulkWrite(
    sessions.map((session) => ({
      updateOne: {
        filter: { session: session._id, student: studentId, channel: 'in_app' },
        update: { $setOnInsert: { dueAt: new Date(session.startsAt.getTime() - 60 * 60 * 1000), status: 'pending', sentAt: null, error: null } },
        upsert: true,
      },
    })),
  );
  return sessions.length;
}

/** Record attendance once per enrolled student; staff may check in too. */
export async function checkInToSession(
  sessionId: string,
  userId: string,
  roles: string[],
): Promise<{ attendance: AttendanceDoc; already: boolean } | null> {
  await connectToDatabase();
  const session = await LiveSession.findById(sessionId).lean();
  if (!session) return null;
  const course = await Course.findById(session.course).select('instructor').lean();
  if (!course) return null;
  const isStaff = roles.includes('admin') || String(course.instructor) === userId;
  if (!isStaff) {
    const enrolled = await Enrolment.exists({ student: userId, course: course._id, status: { $ne: 'refunded' } });
    if (!enrolled) return null;
  }
  const existing = await Attendance.findOne({ session: session._id, student: userId }).lean();
  if (existing) return { attendance: existing as Doc<AttendanceDoc>, already: true };
  const attendance = await Attendance.create({ session: session._id, course: session.course, student: userId, joinedAt: new Date() });
  return { attendance: attendance.toObject() as Doc<AttendanceDoc>, already: false };
}

/** Whether this viewer already checked in to a session. */
export async function hasCheckedIn(sessionId: string, userId: string): Promise<boolean> {
  await connectToDatabase();
  return Boolean(await Attendance.exists({ session: sessionId, student: userId }));
}

/** Instructor attendance list with names resolved in one query. */
export async function listAttendance(sessionId: string): Promise<AttendanceView[]> {
  await connectToDatabase();
  const rows = await Attendance.find({ session: sessionId }).sort({ joinedAt: 1 }).lean();
  const users = await User.find({ _id: { $in: rows.map((row) => row.student) } }).select('name').lean();
  const names = new Map(users.map((user) => [String(user._id), user.name]));
  return rows.map((row) => ({
    studentName: names.get(String(row.student)) ?? 'Learner',
    joinedAt: row.joinedAt.toISOString(),
  }));
}

export type DispatchResult = { sent: number; emailAttempted: number };

/**
 * Pop due reminders from a binary min-heap, mark them sent and create the in-app
 * notification. Peek/pop are O(1)/O(log n); building the heap from N rows is O(N).
 * A user filter keeps the on-page scheduler cheap; the CLI drains every student.
 */
export async function dispatchDueReminders(studentId?: string, now = new Date()): Promise<DispatchResult> {
  await connectToDatabase();
  const query: Record<string, unknown> = { status: 'pending', dueAt: { $lte: now } };
  if (studentId) query.student = studentId;
  const due = await Reminder.find(query).sort({ dueAt: 1 }).limit(500).lean();
  if (due.length === 0) return { sent: 0, emailAttempted: 0 };

  const heap = new MinHeap<Doc<ReminderDoc>>((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
  due.forEach((reminder) => heap.push(reminder as Doc<ReminderDoc>));

  let sent = 0;
  let emailAttempted = 0;
  while (heap.size > 0) {
    const reminder = heap.pop();
    if (!reminder) break;
    const claimed = await Reminder.findOneAndUpdate(
      { _id: reminder._id, status: 'pending' },
      { status: 'sent', sentAt: now },
      { returnDocument: 'after' },
    );
    if (!claimed) continue;
    const session = await LiveSession.findById(reminder.session).lean();
    if (!session) continue;
    const course = await Course.findById(session.course).select('slug').lean();
    await Notification.updateOne(
      { user: reminder.student, kind: 'reminder', session: session._id },
      {
        $setOnInsert: {
          title: { bn: 'লাইভ ক্লাসের মনে করানো', en: 'Live class reminder' },
          body: {
            bn: `${session.title.bn ?? session.title.en ?? 'ক্লাস'} শুরু হবে ${session.startsAt.toLocaleString('bn-BD')}`,
            en: `${session.title.en ?? session.title.bn ?? 'Class'} starts ${session.startsAt.toUTCString()}`,
          },
          href: `/live/${course?.slug ?? ''}`,
          readAt: null,
        },
      },
      { upsert: true },
    );
    sent += 1;
    if (await sendReminderEmail(reminder, session, now)) emailAttempted += 1;
  }
  return { sent, emailAttempted };
}

/** Optional email leg: only runs when a sender key and from-address are configured. */
async function sendReminderEmail(
  reminder: Doc<ReminderDoc>,
  session: Doc<LiveSessionDoc>,
  now: Date,
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.REMINDER_EMAIL_FROM;
  if (!apiKey || !from) return false;
  const student = await User.findById(reminder.student).select('email name').lean();
  if (!student?.email) return false;
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [student.email],
        subject: `Pathshala live class: ${session.title.en ?? session.title.bn ?? 'Class'}`,
        text: `${student.name}, your live class starts at ${session.startsAt.toUTCString()} (${session.durationMinutes} minutes).`,
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`Resend HTTP ${response.status}`);
    return true;
  } catch (error) {
    await Reminder.updateOne({ _id: reminder._id }, { error: error instanceof Error ? error.message : 'email failed', sentAt: now });
    return false;
  }
}

/** Recent reminders shown on the dashboard, newest first. */
export async function getNotifications(userId: string): Promise<NotificationView[]> {
  await connectToDatabase();
  const rows = await Notification.find({ user: userId }).sort({ createdAt: -1 }).limit(10).lean();
  return rows.map((row) => ({
    id: String(row._id),
    title: row.title,
    body: row.body,
    href: row.href,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }));
}

/** Every notification for the notification centre, newest first. */
export async function listNotifications(userId: string): Promise<NotificationView[]> {
  await connectToDatabase();
  const rows = await Notification.find({ user: userId }).sort({ createdAt: -1 }).limit(100).lean();
  return rows.map((row) => ({
    id: String(row._id),
    title: row.title,
    body: row.body,
    href: row.href,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }));
}

/** Count unread rows for the header badge without loading the whole list. */
export async function countUnreadNotifications(userId: string): Promise<number> {
  await connectToDatabase();
  return Notification.countDocuments({ user: userId, readAt: null });
}

/** Mark one notification read, scoped to its owner. */
export async function markNotificationRead(id: string, userId: string): Promise<void> {
  await connectToDatabase();
  await Notification.updateOne({ _id: id, user: userId }, { readAt: new Date() });
}

/** Mark every unread notification read for its owner. */
export async function markAllNotificationsRead(userId: string): Promise<number> {
  await connectToDatabase();
  const result = await Notification.updateMany({ user: userId, readAt: null }, { readAt: new Date() });
  return result.modifiedCount ?? 0;
}

/** Upcoming sessions across every course a student is enrolled in. */
export async function getUpcomingForStudent(userId: string): Promise<Array<LiveSessionView & { courseTitle: { bn?: string; en?: string } }>> {
  await connectToDatabase();
  const courseIds = await Enrolment.find({ student: userId, status: { $ne: 'refunded' } }).select('course').lean();
  if (courseIds.length === 0) return [];
  const sessions = await LiveSession.find({
    course: { $in: courseIds.map((row) => row.course) },
    startsAt: { $gte: new Date() },
    status: 'scheduled',
  })
    .sort({ startsAt: 1 })
    .limit(10)
    .lean();
  const courses = await Course.find({ _id: { $in: sessions.map((session) => session.course) } })
    .select('title slug')
    .lean();
  const titles = new Map(courses.map((course) => [String(course._id), { title: course.title, slug: course.slug }]));
  return sessions.map((session) => {
    const course = titles.get(String(session.course));
    return { ...toView(session as Doc<LiveSessionDoc>), courseSlug: course?.slug ?? '', courseTitle: course?.title ?? {} };
  });
}

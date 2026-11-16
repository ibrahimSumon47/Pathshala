import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connectToDatabase, disconnectFromDatabase } from './connection';
import { getAdminReport, listAuditEvents, setCourseStatus } from './admin';
import { getCertificateByCode, issueCertificateIfEligible } from './certificates';
import {
  checkInToSession,
  createLiveSession,
  dispatchDueReminders,
  getNotifications,
  getSessionForViewer,
  hasCheckedIn,
  listAttendance,
  scheduleSessionReminders,
} from './live';
import { Attendance } from './models/attendance';
import { Category } from './models/category';
import { Course } from './models/course';
import { Enrolment } from './models/enrolment';
import { LiveSession } from './models/live-session';
import { Notification } from './models/notification';
import { Reminder } from './models/reminder';
import { User } from './models/user';

let mongo: MongoMemoryServer;
let courseId = '';
let instructorId = '';
let studentId = '';
let strangerId = '';
let sessionId = '';

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  await connectToDatabase();
  await Promise.all([
    Attendance.init(),
    Category.init(),
    Course.init(),
    Enrolment.init(),
    LiveSession.init(),
    Notification.init(),
    Reminder.init(),
    User.init(),
  ]);

  const [instructor, student, stranger] = await User.create([
    { name: 'Rafiqul Islam', email: 'teacher@example.com', roles: ['instructor'] },
    { name: 'Nusrat Jahan', email: 'student@example.com' },
    { name: 'Outside Learner', email: 'outside@example.com' },
  ]);
  if (!instructor || !student || !stranger) throw new Error('Seed users were not created');
  instructorId = String(instructor._id);
  studentId = String(student._id);
  strangerId = String(stranger._id);
  const category = await Category.create({ name: { bn: 'প্রোগ্রামিং', en: 'Programming' }, slug: 'programming' });
  const course = await Course.create({
    title: { bn: 'জাভাস্ক্রিপ্ট', en: 'JavaScript' },
    slug: 'javascript',
    category: category._id,
    instructor: instructor._id,
    language: 'bn',
    level: 'beginner',
    pricePaisa: 120000,
    status: 'published',
    publishedAt: new Date(),
  });
  courseId = String(course._id);
  await Enrolment.create({ student: student._id, course: course._id, status: 'active', enrolledAt: new Date() });

  const session = await createLiveSession({
    courseId,
    instructorId,
    title: { bn: 'প্রশ্নোত্তর', en: 'Questions' },
    description: { en: 'Bring your questions.' },
    startsAt: new Date(Date.now() + 30 * 60 * 1000),
    durationMinutes: 60,
  });
  sessionId = session.id;
  await scheduleSessionReminders(sessionId);
});

afterAll(async () => {
  await disconnectFromDatabase();
  await mongo?.stop();
});

describe('live classes against an in-memory MongoDB', () => {
  it('gives every session an unguessable room and rejects outsiders', async () => {
    const session = await LiveSession.findById(sessionId).lean();
    expect(session?.roomName).toMatch(/^pathshala-[a-f0-9]{16}$/);
    expect(await getSessionForViewer(sessionId, studentId, ['student'])).not.toBeNull();
    expect(await getSessionForViewer(sessionId, strangerId, ['student'])).toBeNull();
    expect(await getSessionForViewer(sessionId, instructorId, ['instructor'])).not.toBeNull();
  });

  it('schedules one reminder per enrolled student and drains it once', async () => {
    expect(await Reminder.countDocuments({ session: sessionId, student: studentId })).toBe(1);
    const first = await dispatchDueReminders();
    expect(first.sent).toBe(1);
    expect(await Reminder.countDocuments({ session: sessionId, status: 'sent' })).toBe(1);
    const notifications = await getNotifications(studentId);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.href).toContain('/live/javascript');
    expect(await dispatchDueReminders()).toEqual({ sent: 0, emailAttempted: 0 });
  });

  it('checks attendance once and shows the learner to the instructor', async () => {
    const first = await checkInToSession(sessionId, studentId, ['student']);
    expect(first?.already).toBe(false);
    const second = await checkInToSession(sessionId, studentId, ['student']);
    expect(second?.already).toBe(true);
    expect(await hasCheckedIn(sessionId, studentId)).toBe(true);
    expect(await checkInToSession(sessionId, strangerId, ['student'])).toBeNull();
    const list = await listAttendance(sessionId);
    expect(list.map((row) => row.studentName)).toEqual(['Nusrat Jahan']);
  });

  it('issues one certificate after completion and verifies it publicly', async () => {
    await Enrolment.updateOne({ student: studentId, course: courseId }, { status: 'completed', progressPercent: 100 });
    const certificate = await issueCertificateIfEligible(studentId, courseId);
    expect(certificate?.code).toMatch(/^[A-HJ-NP-Z2-9]{16}$/);
    expect(certificate?.studentName).toBe('Nusrat Jahan');
    const again = await issueCertificateIfEligible(studentId, courseId);
    expect(again?.code).toBe(certificate?.code);
    expect((await getCertificateByCode(certificate!.code))?.courseSlug).toBe('javascript');
  });

  it('audits an admin course decision and reports the counts', async () => {
    expect(await setCourseStatus(courseId, 'draft', instructorId)).toBe(true);
    const audit = await listAuditEvents();
    expect(audit[0]?.action).toBe('course.status');
    expect(audit[0]?.actorName).toBe('Rafiqul Islam');
    const report = await getAdminReport();
    expect(report.users).toBe(3);
    expect(report.certificates).toBe(1);
    expect(report.courses).toBe(1);
  });
});

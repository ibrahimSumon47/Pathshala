import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { listAuditEvents } from './admin';
import { createOrderForCourses, markOrderPaid } from './commerce';
import { connectToDatabase, disconnectFromDatabase } from './connection';
import {
  createLiveSession,
  getCourseLiveAttendance,
  getWaitlistForStudent,
  joinSession,
  listAttendance,
  listCourseSessions,
  listNotifications,
  purgeStaleWaitlists,
  releaseAttendance,
} from './live';
import { Category } from './models/category';
import { Course } from './models/course';
import { Enrolment } from './models/enrolment';
import { LiveWaitlist } from './models/live-waitlist';
import { Notification } from './models/notification';
import { User } from './models/user';
import { createInstructorCoupon, listInstructorPromotions } from './promotions';

let mongo: MongoMemoryServer;
let instructorId = '';
let studentAId = '';
let studentBId = '';
let courseId = '';
let salesCourseId = '';

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  await connectToDatabase();
  const [instructor, studentA, studentB] = await User.create([
    { name: 'Rafiqul Islam', email: 'teacher@example.com', roles: ['instructor'] },
    { name: 'Nusrat Jahan', email: 'student-a@example.com' },
    { name: 'Tanvir Ahmed', email: 'student-b@example.com' },
  ]);
  instructorId = String(instructor!._id);
  studentAId = String(studentA!._id);
  studentBId = String(studentB!._id);
  const category = await Category.create({ name: { bn: 'প্রোগ্রামিং', en: 'Programming' }, slug: 'programming' });
  const [liveCourse, salesCourse] = await Course.create([
    {
      title: { bn: 'লাইভ ক্লাস', en: 'Live class' },
      slug: 'live-class',
      category: category._id,
      instructor: instructor!._id,
      language: 'en',
      level: 'beginner',
      pricePaisa: 100000,
      status: 'published',
      publishedAt: new Date(),
    },
    {
      title: { bn: 'বিক্রয় কোর্স', en: 'Sales course' },
      slug: 'sales-course',
      category: category._id,
      instructor: instructor!._id,
      language: 'en',
      level: 'beginner',
      pricePaisa: 50000,
      status: 'published',
      publishedAt: new Date(),
    },
  ]);
  courseId = String(liveCourse!._id);
  salesCourseId = String(salesCourse!._id);
  await Enrolment.create([
    { student: studentA!._id, course: liveCourse!._id, status: 'active' },
    { student: studentB!._id, course: liveCourse!._id, status: 'active' },
  ]);
});

afterAll(async () => {
  await disconnectFromDatabase();
  await mongo?.stop();
});

describe('releasing a seat from the studio', () => {
  it('removes one attendee and tells the next learner in line', async () => {
    const session = await createLiveSession({
      courseId,
      instructorId,
      title: { en: 'Seat release' },
      description: {},
      startsAt: new Date(Date.now() + 60 * 60 * 1000),
      durationMinutes: 60,
      capacity: 1,
    });
    expect(await joinSession(session.id, studentAId, ['student'])).toEqual({ status: 'checked_in', already: false });
    expect(await joinSession(session.id, studentBId, ['student'])).toEqual({ status: 'waitlisted', position: 1 });

    expect(
      await releaseAttendance({ sessionId: session.id, courseId, studentId: studentAId, actorId: instructorId }),
    ).toEqual({ released: true, notified: 1 });
    expect(await listAttendance(session.id)).toEqual([]);
    const notes = await listNotifications(studentBId);
    expect(notes[0]?.title.en).toBe('A seat opened in your live class');
    expect(await joinSession(session.id, studentBId, ['student'])).toEqual({ status: 'checked_in', already: false });
    expect(
      await releaseAttendance({ sessionId: session.id, courseId, studentId: studentAId, actorId: instructorId }),
    ).toEqual({ released: false, notified: 0 });
    const audit = await listAuditEvents();
    expect(audit[0]).toMatchObject({
      actorName: 'Rafiqul Islam',
      action: 'live.seat_release',
      entityType: 'live_session',
      entityId: session.id,
    });
    expect(audit[0]?.metadata.studentId).toBe(studentAId);
  });
});

describe('stale waitlist cleanup', () => {
  it('drops queue rows once the session has started and hides them from reads', async () => {
    const past = await createLiveSession({
      courseId,
      instructorId,
      title: { en: 'Past class' },
      description: {},
      startsAt: new Date(Date.now() - 60 * 60 * 1000),
      durationMinutes: 60,
      capacity: 1,
    });
    expect(await joinSession(past.id, studentAId, ['student'])).toEqual({ status: 'checked_in', already: false });
    expect(await joinSession(past.id, studentBId, ['student'])).toEqual({ status: 'waitlisted', position: 1 });

    const sessions = await listCourseSessions(courseId, 'past');
    expect(sessions.find((session) => session.id === past.id)?.waitlistCount).toBe(0);
    const rows = await getCourseLiveAttendance(courseId, instructorId, false);
    expect(rows?.some((row) => row.session === 'Past class' && row.status === 'waiting')).toBe(false);
    expect(rows?.some((row) => row.session === 'Past class' && row.status === 'attended')).toBe(true);

    expect(await purgeStaleWaitlists()).toBe(1);
    expect(await LiveWaitlist.countDocuments({ session: past.id })).toBe(0);
    expect(await getWaitlistForStudent(studentBId)).toEqual([]);
  });
});

describe('coupon cap note for the teacher', () => {
  it('writes one note when a learner uses up the per-learner allowance', async () => {
    const coupon = await createInstructorCoupon({
      instructorId,
      isAdmin: false,
      code: 'CAP-NOTE',
      type: 'percent',
      value: 10,
      courseId: salesCourseId,
      maxRedemptions: 20,
      maxPerLearner: 1,
      days: 30,
    });
    expect(coupon.ok).toBe(true);
    const order = await createOrderForCourses({
      userId: studentAId,
      courseIds: [salesCourseId],
      couponCode: 'CAP-NOTE',
      idempotencyKey: 'cap-note-order',
    });
    await markOrderPaid({
      orderId: order.orderNumber,
      provider: 'paybridge',
      providerRef: 'cap-note-ref',
      eventId: 'cap-note-event',
      eventType: 'payment.succeeded',
    });

    const note = await Notification.findOne({ user: instructorId, 'title.en': 'Coupon use limit reached' }).lean();
    expect(note).toBeTruthy();
    expect(note?.body.en).toContain('CAP-NOTE');
    expect(note?.body.en).toContain('1-use');
    expect(note?.href).toBe('/studio/promotions');
    expect(note?.ref).toBe('CAP-NOTE');
    const promotions = await listInstructorPromotions(instructorId);
    expect(promotions.coupons.find((row) => row.code === 'CAP-NOTE')?.recentCapAt).toBeTruthy();
  });

  it('stays quiet for an unlimited code', async () => {
    const coupon = await createInstructorCoupon({
      instructorId,
      isAdmin: false,
      code: 'CAP-NONE',
      type: 'fixed',
      value: 5000,
      courseId: salesCourseId,
      maxRedemptions: 20,
      maxPerLearner: 0,
      days: 30,
    });
    expect(coupon.ok).toBe(true);
    const before = await Notification.countDocuments({ user: instructorId, 'title.en': 'Coupon use limit reached' });
    const order = await createOrderForCourses({
      userId: studentBId,
      courseIds: [salesCourseId],
      couponCode: 'CAP-NONE',
      idempotencyKey: 'cap-none-order',
    });
    await markOrderPaid({
      orderId: order.orderNumber,
      provider: 'paybridge',
      providerRef: 'cap-none-ref',
      eventId: 'cap-none-event',
      eventType: 'payment.succeeded',
    });
    expect(await Notification.countDocuments({ user: instructorId, 'title.en': 'Coupon use limit reached' })).toBe(
      before,
    );
  });
});

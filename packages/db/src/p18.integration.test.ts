import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createOrderForCourses, markOrderPaid } from './commerce';
import { connectToDatabase, disconnectFromDatabase } from './connection';
import {
  createLiveSession,
  getCourseLiveAttendance,
  getWaitlistPosition,
  joinSession,
  leaveWaitlist,
  listNotifications,
  updateLiveSessionCapacity,
} from './live';
import { Category } from './models/category';
import { Course } from './models/course';
import { Enrolment } from './models/enrolment';
import { Notification } from './models/notification';
import { User } from './models/user';
import { createInstructorCoupon, listInstructorPromotions } from './promotions';

let mongo: MongoMemoryServer;
let instructorId = '';
let otherInstructorId = '';
let studentAId = '';
let studentBId = '';
let studentCId = '';
let courseId = '';
let salesCourseId = '';
let sessionId = '';

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  await connectToDatabase();
  const [instructor, other, studentA, studentB, studentC] = await User.create([
    { name: 'Rafiqul Islam', email: 'teacher@example.com', roles: ['instructor'] },
    { name: 'Other Teacher', email: 'other@example.com', roles: ['instructor'] },
    { name: 'Nusrat Jahan', email: 'student-a@example.com' },
    { name: 'Tanvir Ahmed', email: 'student-b@example.com' },
    { name: 'Farhana Akter', email: 'student-c@example.com' },
  ]);
  instructorId = String(instructor!._id);
  otherInstructorId = String(other!._id);
  studentAId = String(studentA!._id);
  studentBId = String(studentB!._id);
  studentCId = String(studentC!._id);

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
    { student: studentC!._id, course: liveCourse!._id, status: 'active' },
  ]);
  const session = await createLiveSession({
    courseId,
    instructorId,
    title: { bn: 'প্রশ্নোত্তর', en: 'Questions' },
    description: { en: 'Bring your questions.' },
    startsAt: new Date(Date.now() + 60 * 60 * 1000),
    durationMinutes: 60,
    capacity: 1,
  });
  sessionId = session.id;
  expect(await joinSession(sessionId, studentAId, ['student'])).toEqual({ status: 'checked_in', already: false });
  expect(await joinSession(sessionId, studentBId, ['student'])).toEqual({ status: 'waitlisted', position: 1 });
  expect(await joinSession(sessionId, studentCId, ['student'])).toEqual({ status: 'waitlisted', position: 2 });
});

afterAll(async () => {
  await disconnectFromDatabase();
  await mongo?.stop();
});

describe('seat-opening notifications', () => {
  it('notifies only the learners who now fit and never duplicates a note', async () => {
    expect(await updateLiveSessionCapacity({ sessionId, courseId, capacity: 2 })).toEqual({
      capacity: 2,
      notified: 1,
    });
    const first = await listNotifications(studentBId);
    expect(first.some((notification) => notification.href.startsWith('/live/live-class?session='))).toBe(true);
    expect(await listNotifications(studentCId)).toEqual([]);

    expect(await updateLiveSessionCapacity({ sessionId, courseId, capacity: 3 })).toEqual({
      capacity: 3,
      notified: 1,
    });
    expect(await Notification.countDocuments({ kind: 'seat_open' })).toBe(2);
    expect(await Notification.countDocuments({ kind: 'seat_open', user: studentBId })).toBe(1);
  });

  it('does not change a session through the wrong course id', async () => {
    const unrelated = await Course.create({
      title: { en: 'Unrelated' },
      slug: 'unrelated',
      category: (await Category.findOne({ slug: 'programming' }))!._id,
      instructor: instructorId,
      language: 'en',
      level: 'beginner',
      pricePaisa: 10000,
      status: 'draft',
    });
    expect(await updateLiveSessionCapacity({ sessionId, courseId: String(unrelated._id), capacity: 5 })).toBeNull();
  });
});

describe('leaving a waitlist and exporting the class', () => {
  it('removes only the caller’s place and is idempotent', async () => {
    expect(await leaveWaitlist(sessionId, studentCId)).toBe(true);
    expect(await leaveWaitlist(sessionId, studentCId)).toBe(false);
    expect(await getWaitlistPosition(sessionId, studentCId)).toBeNull();
    expect(await getWaitlistPosition(sessionId, studentBId)).toBe(1);
  });

  it('exports attendance and the remaining queue with positions', async () => {
    const rows = await getCourseLiveAttendance(courseId, instructorId, false);
    expect(rows).not.toBeNull();
    if (!rows) throw new Error('attendance export missing');
    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.learner === 'Nusrat Jahan')).toMatchObject({
      status: 'attended',
      email: 'student-a@example.com',
      position: null,
    });
    expect(rows.find((row) => row.learner === 'Tanvir Ahmed')).toMatchObject({
      status: 'waiting',
      position: 1,
    });
    expect(rows.some((row) => row.learner === 'Farhana Akter')).toBe(false);
    expect(await getCourseLiveAttendance(courseId, otherInstructorId, false)).toBeNull();
  });
});

describe('per-learner cap impact', () => {
  it('counts the buyers who reached the limit for each code', async () => {
    const coupon = await createInstructorCoupon({
      instructorId,
      isAdmin: false,
      code: 'CAP-ONE',
      type: 'percent',
      value: 10,
      courseId: salesCourseId,
      maxRedemptions: 20,
      maxPerLearner: 1,
      days: 30,
    });
    expect(coupon.ok).toBe(true);
    for (const [index, userId] of [studentAId, studentBId].entries()) {
      const order = await createOrderForCourses({
        userId,
        courseIds: [salesCourseId],
        couponCode: 'CAP-ONE',
        idempotencyKey: `cap-order-${index}`,
      });
      await markOrderPaid({
        orderId: order.orderNumber,
        provider: 'paybridge',
        providerRef: `cap-ref-${index}`,
        eventId: `cap-event-${index}`,
        eventType: 'payment.succeeded',
      });
    }
    const promotions = await listInstructorPromotions(instructorId);
    const row = promotions.coupons.find((item) => item.code === 'CAP-ONE');
    expect(row).toMatchObject({ maxPerLearner: 1, learnersAtLimit: 2, redeemedCount: 2 });
  });

  it('leaves the impact blank for an unlimited code', async () => {
    const unlimited = await createInstructorCoupon({
      instructorId,
      isAdmin: false,
      code: 'CAP-OPEN',
      type: 'fixed',
      value: 5000,
      courseId: salesCourseId,
      maxRedemptions: 20,
      maxPerLearner: 0,
      days: 30,
    });
    expect(unlimited.ok).toBe(true);
    const row = (await listInstructorPromotions(instructorId)).coupons.find((item) => item.code === 'CAP-OPEN');
    expect(row).toMatchObject({ maxPerLearner: 0, learnersAtLimit: 0 });
  });
});

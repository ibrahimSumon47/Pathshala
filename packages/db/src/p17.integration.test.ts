import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { listModerationQueue, setSurveysHidden } from './admin';
import { listCategoryCounts } from './catalog';
import { createOrderForCourses, markOrderPaid } from './commerce';
import { connectToDatabase, disconnectFromDatabase } from './connection';
import { createLiveSession, getWaitlistForStudent, getWaitlistPosition, joinSession, listCourseSessions } from './live';
import { Category } from './models/category';
import { CompletionSurvey } from './models/completion-survey';
import { Coupon } from './models/coupon';
import { Course } from './models/course';
import { Enrolment } from './models/enrolment';
import { LiveSession } from './models/live-session';
import { User } from './models/user';
import { getCourseSurveySummary, submitCompletionSurvey } from './surveys';

let mongo: MongoMemoryServer;
let instructorId = '';
let adminId = '';
let studentAId = '';
let studentBId = '';
let courseAId = '';
let courseBId = '';
let courseCId = '';
let courseDId = '';
let sessionId = '';

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  await connectToDatabase();
  const [instructor, admin, studentA, studentB] = await User.create([
    { name: 'Rafiqul Islam', email: 'teacher@example.com', roles: ['instructor'] },
    { name: 'Operator', email: 'admin@example.com', roles: ['admin'] },
    { name: 'Nusrat Jahan', email: 'student-a@example.com' },
    { name: 'Tanvir Ahmed', email: 'student-b@example.com' },
  ]);
  instructorId = String(instructor!._id);
  adminId = String(admin!._id);
  studentAId = String(studentA!._id);
  studentBId = String(studentB!._id);

  const programming = await Category.create({ name: { bn: 'প্রোগ্রামিং', en: 'Programming' }, slug: 'programming' });
  const design = await Category.create({ name: { bn: 'ডিজাইন', en: 'Design' }, slug: 'design' });
  const courses = await Course.create([
    {
      title: { bn: 'জাভাস্ক্রিপ্ট', en: 'JavaScript' },
      slug: 'javascript',
      category: programming._id,
      instructor: instructor!._id,
      language: 'en',
      level: 'beginner',
      pricePaisa: 100000,
      status: 'published',
      publishedAt: new Date(),
    },
    {
      title: { bn: 'পাইথন', en: 'Python' },
      slug: 'python',
      category: programming._id,
      instructor: instructor!._id,
      language: 'en',
      level: 'beginner',
      pricePaisa: 90000,
      status: 'published',
      publishedAt: new Date(),
    },
    {
      title: { bn: 'এইচটিএমএল', en: 'HTML' },
      slug: 'html',
      category: programming._id,
      instructor: instructor!._id,
      language: 'en',
      level: 'beginner',
      pricePaisa: 80000,
      status: 'published',
      publishedAt: new Date(),
    },
    {
      title: { bn: 'সিএসএস', en: 'CSS' },
      slug: 'css',
      category: programming._id,
      instructor: instructor!._id,
      language: 'en',
      level: 'beginner',
      pricePaisa: 70000,
      status: 'published',
      publishedAt: new Date(),
    },
    {
      title: { bn: 'টাইপোগ্রাফি', en: 'Typography' },
      slug: 'typography',
      category: design._id,
      instructor: instructor!._id,
      language: 'en',
      level: 'beginner',
      pricePaisa: 60000,
      status: 'published',
      publishedAt: new Date(),
    },
  ]);
  courseAId = String(courses[0]!._id);
  courseBId = String(courses[1]!._id);
  courseCId = String(courses[2]!._id);
  courseDId = String(courses[3]!._id);

  await Enrolment.create([
    { student: studentA!._id, course: courses[0]!._id, status: 'completed', progressPercent: 100, completedAt: new Date() },
    { student: studentB!._id, course: courses[0]!._id, status: 'active', progressPercent: 20 },
  ]);
  const session = await createLiveSession({
    courseId: courseAId,
    instructorId,
    title: { bn: 'প্রশ্নোত্তর', en: 'Questions' },
    description: { en: 'Bring your questions.' },
    startsAt: new Date(Date.now() + 60 * 60 * 1000),
    durationMinutes: 60,
    capacity: 1,
  });
  sessionId = session.id;
});

afterAll(async () => {
  await disconnectFromDatabase();
  await mongo?.stop();
});

describe('live-class waitlist', () => {
  it('seats the first learner and queues the next with a stable position', async () => {
    expect(await joinSession(sessionId, studentAId, ['student'])).toEqual({ status: 'checked_in', already: false });
    expect(await joinSession(sessionId, studentBId, ['student'])).toEqual({ status: 'waitlisted', position: 1 });
    expect(await joinSession(sessionId, studentBId, ['student'])).toEqual({ status: 'waitlisted', position: 1 });
    expect(await getWaitlistPosition(sessionId, studentBId)).toBe(1);
    expect(await getWaitlistPosition(sessionId, studentAId)).toBeNull();

    const sessions = await listCourseSessions(courseAId, 'upcoming');
    expect(sessions[0]).toMatchObject({ capacity: 1, attendanceCount: 1, waitlistCount: 1 });
    expect((await LiveSession.findById(sessionId).lean())?.capacity).toBe(1);
  });

  it('shows the waiting learner their upcoming place and refuses a non-enrolled account', async () => {
    const waiting = await getWaitlistForStudent(studentBId);
    expect(waiting).toHaveLength(1);
    expect(waiting[0]).toMatchObject({ sessionId, courseSlug: 'javascript', position: 1, capacity: 1 });
    expect(await getWaitlistForStudent(studentAId)).toEqual([]);

    const outsider = await User.create({ name: 'Outside', email: 'outside@example.com' });
    expect(await joinSession(sessionId, String(outsider._id), ['student'])).toBeNull();
  });
});

describe('per-learner coupon limits', () => {
  it('blocks a second paid order with the same code for one account', async () => {
    await Coupon.create({
      code: 'ONE-PER',
      type: 'percent',
      value: 10,
      minAmountPaisa: 0,
      maxRedemptions: 50,
      maxPerLearner: 1,
      active: true,
      course: null,
      createdBy: adminId,
    });
    const first = await createOrderForCourses({
      userId: studentBId,
      courseIds: [courseBId],
      couponCode: 'ONE-PER',
      idempotencyKey: 'coupon-first',
    });
    await markOrderPaid({
      orderId: first.orderNumber,
      provider: 'paybridge',
      providerRef: 'coupon-first-ref',
      eventId: 'coupon-first-event',
      eventType: 'payment.succeeded',
    });

    await expect(
      createOrderForCourses({
        userId: studentBId,
        courseIds: [courseCId],
        couponCode: 'ONE-PER',
        idempotencyKey: 'coupon-second',
      }),
    ).rejects.toMatchObject({ code: 'coupon_learner_limit' });
  });

  it('keeps zero as an explicit unlimited choice', async () => {
    await Coupon.create({
      code: 'OPEN',
      type: 'fixed',
      value: 5000,
      minAmountPaisa: 0,
      maxRedemptions: 50,
      maxPerLearner: 0,
      active: true,
      course: null,
      createdBy: adminId,
    });
    const first = await createOrderForCourses({
      userId: studentBId,
      courseIds: [courseCId],
      couponCode: 'OPEN',
      idempotencyKey: 'open-first',
    });
    await markOrderPaid({
      orderId: first.orderNumber,
      provider: 'paybridge',
      providerRef: 'open-first-ref',
      eventId: 'open-first-event',
      eventType: 'payment.succeeded',
    });
    const second = await createOrderForCourses({
      userId: studentBId,
      courseIds: [courseDId],
      couponCode: 'OPEN',
      idempotencyKey: 'open-second',
    });
    expect(second.discountPaisa).toBe(5000);
  });
});

describe('survey comments and moderation', () => {
  it('shows anonymous comments to the teacher and drops hidden ones from averages', async () => {
    expect(
      await submitCompletionSurvey(studentAId, courseAId, {
        difficulty: 2,
        pace: 3,
        confidence: 5,
        comment: 'The worked examples made the difference.',
      }),
    ).toBe('saved');
    const visible = await getCourseSurveySummary(courseAId);
    expect(visible).toMatchObject({ count: 1, difficulty: 2, pace: 3, confidence: 5 });
    expect(visible.comments.map((comment) => comment.body)).toEqual(['The worked examples made the difference.']);

    const queue = await listModerationQueue();
    const row = queue.surveys.find((survey) => survey.comment.includes('worked examples'));
    expect(row).toBeTruthy();
    expect(await setSurveysHidden([row!.id], true)).toBe(1);
    expect(await getCourseSurveySummary(courseAId)).toMatchObject({ count: 0, comments: [] });
    expect((await listModerationQueue()).surveys.find((survey) => survey.id === row!.id)?.hidden).toBe(true);

    await setSurveysHidden([row!.id], false);
    expect((await getCourseSurveySummary(courseAId)).comments).toHaveLength(1);
    expect(await CompletionSurvey.countDocuments({ course: courseAId })).toBe(1);
  });
});

describe('zero-result catalogue help', () => {
  it('suggests subjects with published courses and can exclude the current one', async () => {
    const nearby = await listCategoryCounts({ excludeSlug: 'programming' });
    expect(nearby).toHaveLength(1);
    expect(nearby[0]).toMatchObject({ slug: 'design', count: 1 });

    const all = await listCategoryCounts();
    expect(all.find((row) => row.slug === 'programming')?.count).toBe(4);
  });
});

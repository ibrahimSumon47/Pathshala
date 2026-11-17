import { MongoMemoryServer } from 'mongodb-memory-server';
import { Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  getAdminReport,
  getPlatformRevenue,
  setQuestionHidden,
  setQuestionsHidden,
  setReviewHidden,
  setReviewsHidden,
} from './admin';
import { announceToCourse, getInstructorCommunity, replyToCourseReview } from './community';
import {
  PLATFORM_SHARE_PERCENT,
  createOrderForCourses,
  getInstructorEarnings,
  markOrderPaid,
  markOrderRefunded,
} from './commerce';
import { connectToDatabase, disconnectFromDatabase } from './connection';
import { getInstructorStatements, listAdminOrders, listPayoutStatements, setStatementPaid } from './earnings';
import { Notification } from './models/notification';
import { Category } from './models/category';
import { Enrolment } from './models/enrolment';
import { Course } from './models/course';
import { LedgerEntry } from './models/ledger-entry';
import { Question } from './models/question';
import { Review } from './models/review';
import { User } from './models/user';

let mongo: MongoMemoryServer;
let instructorId = '';
let studentId = '';
let courseId = '';
let orderNumber = '';

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  await connectToDatabase();
  const [instructor, student] = await User.create([
    { name: 'Rafiqul Islam', email: 'teacher@example.com', roles: ['instructor'] },
    { name: 'Nusrat Jahan', email: 'student@example.com' },
  ]);
  if (!instructor || !student) throw new Error('Seed users were not created');
  instructorId = String(instructor._id);
  studentId = String(student._id);
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
  const order = await createOrderForCourses({ userId: studentId, courseIds: [courseId], idempotencyKey: 'profile-order' });
  orderNumber = order.orderNumber;
});

afterAll(async () => {
  await disconnectFromDatabase();
  await mongo?.stop();
});

describe('platform share of a paid sale', () => {
  it('keeps twenty percent on the order and in the ledger', async () => {
    const paid = await markOrderPaid({
      orderId: orderNumber,
      provider: 'paybridge',
      providerRef: 'paybridge-ref-1',
      eventId: 'event-paid-1',
      eventType: 'payment.succeeded',
    });
    expect(paid.duplicate).toBe(false);
    expect(paid.order.totalPaisa).toBe(120000);
    expect(paid.order.platformFeePaisa).toBe(24000);
    expect(paid.order.platformFeePaisa).toBe(Math.round((paid.order.totalPaisa * PLATFORM_SHARE_PERCENT) / 100));

    const revenue = await getPlatformRevenue();
    expect(revenue).toMatchObject({
      grossPaisa: 120000,
      platformPaisa: 24000,
      refundedPaisa: 0,
      paidOrders: 1,
      sharePercent: 20,
    });
    expect((await getInstructorEarnings(instructorId)).totalPaisa).toBe(96000);
    expect((await getAdminReport()).platformPaisa).toBe(24000);

    const orders = await listAdminOrders(orderNumber);
    expect(orders).toHaveLength(1);
    expect(orders[0]).toMatchObject({ orderNumber, buyerEmail: 'student@example.com', platformFeePaisa: 24000, status: 'paid' });

    const statements = await getInstructorStatements(instructorId);
    expect(statements).toHaveLength(1);
    expect(statements[0]).toMatchObject({ salesPaisa: 96000, netPaisa: 96000, sales: 1 });

    const alert = await Notification.findOne({ user: instructorId, href: '/studio' }).lean();
    expect(alert?.title.en).toBe('New sale');
  });

  it('takes the platform share back out on refund', async () => {
    await markOrderRefunded({
      orderId: orderNumber,
      provider: 'paybridge',
      providerRef: 'paybridge-ref-1',
      eventId: 'event-refund-1',
      eventType: 'payment.refunded',
    });
    const revenue = await getPlatformRevenue();
    expect(revenue.platformPaisa).toBe(0);
    expect(revenue.refundedPaisa).toBe(120000);
    expect(revenue.refundedOrders).toBe(1);
    expect((await getInstructorEarnings(instructorId)).totalPaisa).toBe(0);
  });

  it('ignores ledger rows whose order no longer exists', async () => {
    const order = await createOrderForCourses({ userId: studentId, courseIds: [courseId], idempotencyKey: 'orphan-check' });
    await LedgerEntry.create({
      order: new Types.ObjectId(String((order as unknown as { _id: Types.ObjectId })._id)),
      instructor: instructorId,
      account: 'platform',
      type: 'sale',
      amountPaisa: 999999,
      description: 'Removed order left a row behind',
    });

    const revenue = await getPlatformRevenue();
    expect(revenue.grossPaisa).toBe(0);
    expect(revenue.platformPaisa).toBe(0);
  });
});

describe('moderation', () => {
  it('hides a review and updates the public rating, then restores it', async () => {
    const review = await Review.create({ course: courseId, student: studentId, rating: 4, body: 'Useful.' });
    expect(await setReviewHidden(String(review._id), true)).toBe(true);
    expect((await Course.findById(courseId).lean())?.ratingCount).toBe(0);
    expect((await Review.findById(review._id).lean())?.hidden).toBe(true);

    expect(await setReviewHidden(String(review._id), false)).toBe(true);
    const course = await Course.findById(courseId).lean();
    expect(course?.ratingCount).toBe(1);
    expect(course?.ratingAverage).toBe(4);
  });

  it('hides a lesson question without deleting it', async () => {
    const question = await Question.create({
      course: courseId,
      lesson: new Types.ObjectId(),
      author: studentId,
      body: 'How does this work?',
    });
    expect(await setQuestionHidden(String(question._id), true)).toBe(true);
    expect((await Question.findById(question._id).lean())?.hidden).toBe(true);
    expect(await setQuestionHidden('not-an-id', true)).toBe(false);
  });
});

describe('payout settlement', () => {
  it('marks a month paid for the teacher and the operator, then reopens it', async () => {
    const order = await createOrderForCourses({ userId: studentId, courseIds: [courseId], idempotencyKey: 'payout-order' });
    await markOrderPaid({
      orderId: order.orderNumber,
      provider: 'paybridge',
      providerRef: 'paybridge-payout-ref',
      eventId: 'event-payout-paid',
      eventType: 'payment.succeeded',
    });
    const statement = (await getInstructorStatements(instructorId))[0];
    expect(statement).toBeDefined();
    if (!statement) throw new Error('Expected a statement');

    expect(
      await setStatementPaid({
        instructorId,
        month: statement.month,
        amountPaisa: Math.max(0, statement.netPaisa),
        adminId: instructorId,
        paid: true,
      }),
    ).toBe(true);

    const paid = (await getInstructorStatements(instructorId)).find((row) => row.month === statement.month);
    expect(paid?.paidAt).toBeTruthy();
    const adminRows = await listPayoutStatements();
    expect(adminRows.find((row) => row.instructorId === instructorId && row.month === statement.month)?.paidAt).toBeTruthy();

    expect(
      await setStatementPaid({ instructorId, month: statement.month, amountPaisa: 0, adminId: instructorId, paid: false }),
    ).toBe(true);
    const reopened = (await getInstructorStatements(instructorId)).find((row) => row.month === statement.month);
    expect(reopened?.paidAt).toBeNull();
  });

  it('rejects a malformed month or instructor id', async () => {
    expect(
      await setStatementPaid({ instructorId, month: '2026-13', amountPaisa: 1, adminId: instructorId, paid: true }),
    ).toBe(false);
    expect(
      await setStatementPaid({ instructorId: 'bad', month: '2026-11', amountPaisa: 1, adminId: instructorId, paid: true }),
    ).toBe(false);
  });
});

describe('instructor community', () => {
  it('lists owned reviews and saves a reply only for the owning instructor', async () => {
    const community = await getInstructorCommunity(instructorId);
    expect(community.courses.some((course) => course.id === courseId)).toBe(true);
    const review = community.reviews[0];
    expect(review).toBeDefined();
    if (!review) throw new Error('Expected a review');

    expect(
      await replyToCourseReview({
        reviewId: review.id,
        instructorId: new Types.ObjectId().toString(),
        isAdmin: false,
        body: 'Not my course',
      }),
    ).toBe(false);
    expect(
      await replyToCourseReview({ reviewId: review.id, instructorId, isAdmin: false, body: 'Thank you for the notes.' }),
    ).toBe(true);
    const saved = await Review.findById(review.id).lean();
    expect(saved?.replyBody).toBe('Thank you for the notes.');
    expect(saved?.repliedAt).toBeTruthy();
  });

  it('sends one inbox notification per enrolled learner and refuses another teacher', async () => {
    await Enrolment.updateOne(
      { student: studentId, course: courseId },
      { $setOnInsert: { student: studentId, course: courseId, status: 'active' } },
      { upsert: true },
    );
    const before = await Notification.countDocuments({ user: studentId, href: '/learn/javascript' });
    const sent = await announceToCourse({ courseId, instructorId, isAdmin: false, message: 'Live class moved to Friday.' });
    expect(sent).toBeGreaterThanOrEqual(1);
    const after = await Notification.countDocuments({ user: studentId, href: '/learn/javascript' });
    expect(after - before).toBe(sent);
    const notification = await Notification.findOne({ user: studentId, href: '/learn/javascript' }).sort({ createdAt: -1 }).lean();
    expect(notification?.body.en).toBe('Live class moved to Friday.');

    expect(
      await announceToCourse({
        courseId,
        instructorId: new Types.ObjectId().toString(),
        isAdmin: false,
        message: 'Should not send',
      }),
    ).toBeNull();
  });
});

describe('bulk moderation', () => {
  it('hides and restores several reviews, refreshing the course rating once', async () => {
    const [first, second] = await User.create([
      { name: 'Bulk One', email: 'bulk-one@example.com' },
      { name: 'Bulk Two', email: 'bulk-two@example.com' },
    ]);
    if (!first || !second) throw new Error('Bulk users were not created');
    const reviews = await Review.create([
      { course: courseId, student: first._id, rating: 2, body: 'Could be clearer.' },
      { course: courseId, student: second._id, rating: 5, body: 'Loved it.' },
    ]);
    const ids = reviews.map((review) => String(review._id));
    expect(await setReviewsHidden(ids, true)).toBe(2);
    expect(await Review.countDocuments({ _id: { $in: ids }, hidden: true })).toBe(2);
    const hiddenCourse = await Course.findById(courseId).lean();
    expect(hiddenCourse?.ratingCount).toBe(1);

    expect(await setReviewsHidden(ids, false)).toBe(2);
    expect(await Review.countDocuments({ _id: { $in: ids }, hidden: false })).toBe(2);
    const restored = await Course.findById(courseId).lean();
    expect(restored?.ratingCount).toBe(3);
  });

  it('hides several questions in one update', async () => {
    const questions = await Question.create([
      { course: courseId, lesson: new Types.ObjectId(), author: studentId, body: 'First bulk question?' },
      { course: courseId, lesson: new Types.ObjectId(), author: studentId, body: 'Second bulk question?' },
    ]);
    const ids = questions.map((question) => String(question._id));
    expect(await setQuestionsHidden(ids, true)).toBe(2);
    expect(await Question.countDocuments({ _id: { $in: ids }, hidden: true })).toBe(2);
  });
});

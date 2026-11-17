import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createOrderForCourses,
  markOrderPaid,
} from './commerce';
import { answerCourseQuestion, getInstructorQuestions } from './community';
import { connectToDatabase, disconnectFromDatabase } from './connection';
import { notifyWishlistPriceDrop } from './learner';
import { Category } from './models/category';
import { Course } from './models/course';
import { Enrolment } from './models/enrolment';
import { Lesson } from './models/lesson';
import { Notification } from './models/notification';
import { Order } from './models/order';
import { Question } from './models/question';
import { RefundRequest } from './models/refund-request';
import { SavedSearch } from './models/saved-search';
import { Section } from './models/section';
import { reviewQuiz } from './models/quiz';
import { User } from './models/user';
import { Wishlist } from './models/wishlist';
import { createInstructorCoupon, listInstructorPromotions, setInstructorCouponActive } from './promotions';
import { decideRefundRequest, getStudentRefundRequests, listRefundRequests, requestRefund } from './refunds';
import { checkSavedSearches, createSavedSearch, listSavedSearches, savedSearchFilter } from './saved-searches';

let mongo: MongoMemoryServer;
let instructorId = '';
let studentId = '';
let adminId = '';
let courseId = '';
let otherCourseId = '';
let lessonId = '';

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  await connectToDatabase();
  const [instructor, student, admin] = await User.create([
    { name: 'Rafiqul Islam', email: 'teacher@example.com', roles: ['instructor'] },
    { name: 'Nusrat Jahan', email: 'student@example.com' },
    { name: 'Operator', email: 'admin@example.com', roles: ['admin'] },
  ]);
  instructorId = String(instructor!._id);
  studentId = String(student!._id);
  adminId = String(admin!._id);
  const category = await Category.create({ name: { bn: 'প্রোগ্রামিং', en: 'Programming' }, slug: 'programming' });
  const course = await Course.create({
    title: { bn: 'জাভাস্ক্রিপ্ট', en: 'JavaScript' },
    slug: 'javascript',
    category: category._id,
    instructor: instructor!._id,
    language: 'bn',
    level: 'beginner',
    pricePaisa: 120000,
    status: 'published',
    publishedAt: new Date(Date.now() - 60_000),
  });
  courseId = String(course._id);
  const section = await Section.create({ course: course._id, title: { bn: 'ভূমিকা', en: 'Introduction' }, order: 1 });
  const lesson = await Lesson.create({
    course: course._id,
    section: section._id,
    title: { bn: 'প্রথম পাঠ', en: 'First lesson' },
    order: 1,
    type: 'reading',
  });
  lessonId = String(lesson._id);
  const other = await Course.create({
    title: { bn: 'পাইথন', en: 'Python' },
    slug: 'python',
    category: category._id,
    instructor: admin!._id,
    language: 'en',
    level: 'advanced',
    pricePaisa: 90000,
    status: 'published',
    publishedAt: new Date(),
  });
  otherCourseId = String(other._id);
});

afterAll(async () => {
  await disconnectFromDatabase();
  await mongo?.stop();
});

async function paidOrder(key: string): Promise<string> {
  // A previous test's paid enrolment would block a new order for the same course.
  await Enrolment.deleteMany({ student: studentId, course: courseId });
  const order = await createOrderForCourses({ userId: studentId, courseIds: [courseId], idempotencyKey: key });
  await markOrderPaid({
    orderId: order.orderNumber,
    provider: 'paybridge',
    providerRef: `ref-${key}`,
    eventId: `event-${key}`,
    eventType: 'payment.succeeded',
  });
  return order.orderNumber;
}

describe('refund requests', () => {
  it('queues one request per paid order and reaches the operator desk', async () => {
    const orderNumber = await paidOrder('refund-a');
    expect(await requestRefund({ orderNumber, userId: studentId, reason: 'Changed my plans' })).toBe('created');
    expect(await requestRefund({ orderNumber, userId: studentId, reason: 'Again please' })).toBe('duplicate');

    const mine = await getStudentRefundRequests(studentId);
    expect(mine.some((row) => row.orderNumber === orderNumber && row.status === 'pending')).toBe(true);
    const queue = await listRefundRequests();
    const row = queue.find((entry) => entry.orderNumber === orderNumber);
    expect(row).toMatchObject({ buyerEmail: 'student@example.com', status: 'pending' });
  });

  it('refuses someone else’s order and a learner past a quarter of the course', async () => {
    const orderNumber = await paidOrder('refund-b');
    expect(await requestRefund({ orderNumber, userId: adminId, reason: 'Not mine' })).toBe('not_found');

    await Enrolment.updateOne({ student: studentId, course: courseId }, { progressPercent: 25 });
    expect(await requestRefund({ orderNumber, userId: studentId, reason: 'Half watched' })).toBe('window_closed');
    await Enrolment.updateOne({ student: studentId, course: courseId }, { progressPercent: 0 });
  });

  it('approving refunds the order and closes the enrolment; declining changes nothing', async () => {
    const orderNumber = await paidOrder('refund-c');
    await requestRefund({ orderNumber, userId: studentId, reason: 'Please refund' });
    const request = await RefundRequest.findOne({ order: (await Order.findOne({ orderNumber }))!._id });
    expect(await decideRefundRequest({ requestId: String(request!._id), adminId, approve: true })).toBe('approved');
    const order = await Order.findOne({ orderNumber }).lean();
    expect(order?.status).toBe('refunded');
    const enrolment = await Enrolment.findOne({ student: studentId, course: courseId }).lean();
    expect(enrolment?.status).toBe('refunded');
    expect(await Notification.countDocuments({ user: studentId, href: '/dashboard/orders' })).toBeGreaterThan(0);

    const secondNumber = await paidOrder('refund-d');
    await requestRefund({ orderNumber: secondNumber, userId: studentId, reason: 'Second thoughts' });
    const second = await RefundRequest.findOne({ order: (await Order.findOne({ orderNumber: secondNumber }))!._id });
    expect(await decideRefundRequest({ requestId: String(second!._id), adminId, approve: false })).toBe('declined');
    expect((await Order.findOne({ orderNumber: secondNumber }).lean())?.status).toBe('paid');
  });
});

describe('instructor promotions', () => {
  it('creates a course-scoped code and turns it off', async () => {
    const created = await createInstructorCoupon({
      instructorId,
      isAdmin: false,
      code: 'spring-25',
      type: 'percent',
      value: 25,
      courseId,
      maxRedemptions: 50,
      days: 30,
    });
    expect(created).toEqual({ ok: true, code: 'SPRING-25' });
    const view = await listInstructorPromotions(instructorId);
    const coupon = view.coupons.find((row) => row.code === 'SPRING-25');
    expect(coupon).toMatchObject({ type: 'percent', value: 25, courseId, active: true });
    expect(await setInstructorCouponActive({ couponId: coupon!.id, instructorId, isAdmin: false, active: false })).toBe(true);
    const after = await listInstructorPromotions(instructorId);
    expect(after.coupons.find((row) => row.code === 'SPRING-25')?.active).toBe(false);
  });

  it('refuses another teacher’s course and a duplicate code', async () => {
    expect(
      await createInstructorCoupon({
        instructorId,
        isAdmin: false,
        code: 'NOT-MINE',
        type: 'percent',
        value: 10,
        courseId: otherCourseId,
        maxRedemptions: 10,
        days: 0,
      }),
    ).toEqual({ ok: false, error: 'course' });

    expect(
      await createInstructorCoupon({
        instructorId,
        isAdmin: false,
        code: 'SPRING-25',
        type: 'fixed',
        value: 5000,
        courseId,
        maxRedemptions: 10,
        days: 0,
      }),
    ).toEqual({ ok: false, error: 'duplicate' });
  });
});

describe('instructor question desk', () => {
  it('shows unanswered threads and answers only its own course', async () => {
    const question = await Question.create({
      course: courseId,
      lesson: lessonId,
      author: studentId,
      body: 'How does the event loop work?',
    });
    const desk = await getInstructorQuestions(instructorId);
    expect(desk.unanswered).toBeGreaterThan(0);
    expect(desk.questions[0]?.id).toBe(String(question._id));

    expect(
      await answerCourseQuestion({ questionId: String(question._id), instructorId, isAdmin: false, body: 'It queues callbacks.' }),
    ).toBe(true);
    const answered = await Question.findById(question._id).lean();
    expect(answered?.answers).toHaveLength(1);

    const foreign = await Question.create({
      course: otherCourseId,
      lesson: lessonId,
      author: studentId,
      body: 'Not my course?',
    });
    expect(
      await answerCourseQuestion({ questionId: String(foreign._id), instructorId, isAdmin: false, body: 'Nope' }),
    ).toBe(false);
  });

  it('hides moderated threads from the desk', async () => {
    const hidden = await Question.create({
      course: courseId,
      lesson: lessonId,
      author: studentId,
      body: 'Hidden thread',
      hidden: true,
    });
    const desk = await getInstructorQuestions(instructorId);
    expect(desk.questions.some((row) => row.id === String(hidden._id))).toBe(false);
  });
});

describe('saved searches', () => {
  it('stores a search, then announces courses published after it', async () => {
    expect(await createSavedSearch(studentId, { label: 'Python', query: 'Python', level: '', language: '', maxPricePaisa: null })).toBe('created');
    const saved = await listSavedSearches(studentId);
    const python = saved.find((row) => row.label === 'Python');
    expect(python).toBeTruthy();

    const filter = savedSearchFilter(
      { query: 'Python', level: '', language: '', maxPricePaisa: null },
      new Date(Date.now() + 1000),
    );
    expect(await Course.countDocuments(filter)).toBe(0);

    await Course.updateOne({ _id: otherCourseId }, { publishedAt: new Date(Date.now() + 2000) });
    const result = await checkSavedSearches(studentId, new Date(Date.now() + 3000));
    expect(result).toMatchObject({ checked: 1, newMatches: 1 });
    expect(
      await Notification.countDocuments({ user: studentId, 'title.en': 'New courses match your search' }),
    ).toBeGreaterThan(0);
    expect((await SavedSearch.findOne({ user: studentId, label: 'Python' }).lean())?.lastMatchCount).toBe(1);
  });

  it('requires a query or a filter and caps the list', async () => {
    expect(await createSavedSearch(studentId, { label: 'Empty', query: '', level: '', language: '', maxPricePaisa: null })).toBe('invalid');
    for (let index = 0; index < 10; index += 1) {
      await createSavedSearch(studentId, {
        label: `Search ${index}`,
        query: `Course ${index}`,
        level: '',
        language: '',
        maxPricePaisa: null,
      });
    }
    expect(
      await createSavedSearch(studentId, { label: 'One too many', query: 'More', level: '', language: '', maxPricePaisa: null }),
    ).toBe('limit');
  });
});

describe('wishlist price alerts', () => {
  it('notifies savers only when the price falls', async () => {
    await Wishlist.create({ student: studentId, course: courseId });
    expect(await notifyWishlistPriceDrop({ courseId, oldPricePaisa: 120000, newPricePaisa: 150000 })).toBe(0);
    expect(await notifyWishlistPriceDrop({ courseId, oldPricePaisa: 120000, newPricePaisa: 90000 })).toBe(1);
    expect(await Notification.countDocuments({ user: studentId, href: '/courses/javascript' })).toBe(1);
  });
});

describe('quiz review', () => {
  it('marks each question and carries the explanation', () => {
    const review = reviewQuiz(
      [
        { correctIndexes: [1], points: 2, explanation: 'Indexes start at zero.' },
        { correctIndexes: [0, 2], points: 3, explanation: '' },
      ],
      [[1], [0]],
    );
    expect(review[0]).toMatchObject({ earned: true, points: 2, explanation: 'Indexes start at zero.' });
    expect(review[1]).toMatchObject({ earned: false, correctIndexes: [0, 2] });
  });
});

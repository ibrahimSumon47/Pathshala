import { MongoMemoryServer } from 'mongodb-memory-server';
import { Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getAdminReport, getPlatformRevenue } from './admin';
import {
  PLATFORM_SHARE_PERCENT,
  createOrderForCourses,
  getInstructorEarnings,
  markOrderPaid,
  markOrderRefunded,
} from './commerce';
import { connectToDatabase, disconnectFromDatabase } from './connection';
import { Category } from './models/category';
import { Course } from './models/course';
import { LedgerEntry } from './models/ledger-entry';
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

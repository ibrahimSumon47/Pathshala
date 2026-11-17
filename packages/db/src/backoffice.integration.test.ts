import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getCertificateByCode, issueCertificateIfEligible, listAdminCertificates, setCertificateRevoked } from './certificates';
import { createOrderForCourses, markOrderPaid } from './commerce';
import { connectToDatabase, disconnectFromDatabase } from './connection';
import { moveLesson } from './curriculum';
import { getCouponRedemptionTimeline } from './earnings';
import { Category } from './models/category';
import { Course } from './models/course';
import { Enrolment } from './models/enrolment';
import { Lesson } from './models/lesson';
import { QuizQuestion } from './models/quiz';
import { SavedSearch } from './models/saved-search';
import { Section } from './models/section';
import { User } from './models/user';
import { createInstructorCoupon } from './promotions';
import { addBankItemToQuiz, listQuestionBank, saveQuestionToBank } from './question-bank';
import { getCourseRoster } from './roster';
import { checkDueSavedSearches, createSavedSearch } from './saved-searches';
import { getCourseSurveySummary, getSurveyableCourses, submitCompletionSurvey } from './surveys';

let mongo: MongoMemoryServer;
let instructorId = '';
let otherInstructorId = '';
let studentId = '';
let activeStudentId = '';
let refundedStudentId = '';
let adminId = '';
let buyerId = '';
let lateLearnerId = '';
let courseId = '';
let otherCourseId = '';
let sectionId = '';
let firstLessonId = '';
let secondLessonId = '';
let thirdLessonId = '';
let quizLessonId = '';
let bankQuizLessonId = '';
let certificateCode = '';

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  await connectToDatabase();
  const [instructor, otherInstructor, student, activeStudent, refundedStudent, admin, buyer, lateLearner] =
    await User.create([
      { name: 'Rafiqul Islam', email: 'teacher@example.com', roles: ['instructor'] },
      { name: 'Farhana Akter', email: 'other-teacher@example.com', roles: ['instructor'] },
      { name: 'Nusrat Jahan', email: 'student@example.com' },
      { name: 'Tanvir Ahmed', email: 'active@example.com' },
      { name: 'Mita Das', email: 'refunded@example.com' },
      { name: 'Operator', email: 'admin@example.com', roles: ['admin'] },
      { name: 'Buyer One', email: 'buyer@example.com' },
      { name: 'Late Learner', email: 'late@example.com' },
    ]);
  instructorId = String(instructor!._id);
  otherInstructorId = String(otherInstructor!._id);
  studentId = String(student!._id);
  activeStudentId = String(activeStudent!._id);
  refundedStudentId = String(refundedStudent!._id);
  adminId = String(admin!._id);
  buyerId = String(buyer!._id);
  lateLearnerId = String(lateLearner!._id);

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
  sectionId = String(section._id);
  const lessons = await Lesson.create([
    { course: course._id, section: section._id, title: { bn: 'প্রথম পাঠ', en: 'First lesson' }, order: 1 },
    { course: course._id, section: section._id, title: { bn: 'দ্বিতীয় পাঠ', en: 'Second lesson' }, order: 2 },
    { course: course._id, section: section._id, title: { bn: 'তৃতীয় পাঠ', en: 'Third lesson' }, order: 3 },
    {
      course: course._id,
      section: section._id,
      title: { bn: 'কুইজ', en: 'Quiz' },
      order: 4,
      type: 'quiz',
    },
    {
      course: course._id,
      section: section._id,
      title: { bn: 'দ্বিতীয় কুইজ', en: 'Second quiz' },
      order: 5,
      type: 'quiz',
    },
  ]);
  firstLessonId = String(lessons[0]!._id);
  secondLessonId = String(lessons[1]!._id);
  thirdLessonId = String(lessons[2]!._id);
  quizLessonId = String(lessons[3]!._id);
  bankQuizLessonId = String(lessons[4]!._id);

  const other = await Course.create({
    title: { bn: 'পাইথন', en: 'Python' },
    slug: 'python',
    category: category._id,
    instructor: otherInstructor!._id,
    language: 'en',
    level: 'advanced',
    pricePaisa: 90000,
    status: 'published',
    publishedAt: new Date(Date.now() - 120_000),
  });
  otherCourseId = String(other._id);

  await Enrolment.create({
    student: student!._id,
    course: course._id,
    status: 'completed',
    progressPercent: 100,
    completedLessonIds: lessons.map((lesson) => lesson._id),
    completedAt: new Date(),
  });
  await Enrolment.create({
    student: activeStudent!._id,
    course: course._id,
    status: 'active',
    progressPercent: 40,
    completedLessonIds: [lessons[0]!._id],
  });
  await Enrolment.create({
    student: refundedStudent!._id,
    course: course._id,
    status: 'refunded',
    progressPercent: 10,
  });
  certificateCode = (await issueCertificateIfEligible(studentId, courseId))?.code ?? '';
});

afterAll(async () => {
  await disconnectFromDatabase();
  await mongo?.stop();
});

describe('student roster', () => {
  it('shows active and completed learners with certificates, never refunded rows', async () => {
    const roster = await getCourseRoster(courseId, instructorId, false);
    expect(roster).not.toBeNull();
    expect(roster!.total).toBe(2);
    expect(roster!.completed).toBe(1);
    expect(roster!.averageProgress).toBe(70);
    const completed = roster!.students.find((row) => row.id === studentId);
    expect(completed).toMatchObject({ progressPercent: 100, status: 'completed', surveySubmitted: false });
    expect(completed!.certificateCode).toBe(certificateCode);
    expect(roster!.students.some((row) => row.id === refundedStudentId)).toBe(false);
  });

  it('is scoped to the owning teacher, while an admin can read any course', async () => {
    expect(await getCourseRoster(courseId, otherInstructorId, false)).toBeNull();
    expect((await getCourseRoster(courseId, adminId, true))?.total).toBe(2);
  });
});

describe('lesson ordering', () => {
  it('moves a lesson up and back down without breaking the unique order index', async () => {
    const move = (lessonId: string, direction: 'up' | 'down') =>
      moveLesson({ courseId, lessonId, instructorId, isAdmin: false, direction });

    expect(await move(secondLessonId, 'up')).toBe('moved');
    let rows = await Lesson.find({ section: sectionId }).sort({ order: 1 }).select('_id order').lean();
    expect(rows.map((row) => String(row._id))).toEqual([secondLessonId, firstLessonId, thirdLessonId, quizLessonId, bankQuizLessonId]);

    expect(await move(secondLessonId, 'down')).toBe('moved');
    rows = await Lesson.find({ section: sectionId }).sort({ order: 1 }).select('_id order').lean();
    expect(rows.map((row) => String(row._id))).toEqual([firstLessonId, secondLessonId, thirdLessonId, quizLessonId, bankQuizLessonId]);
    expect(rows.map((row) => row.order)).toEqual([1, 2, 3, 4, 5]);
  });

  it('refuses the edges and another teacher’s lesson', async () => {
    expect(
      await moveLesson({ courseId, lessonId: firstLessonId, instructorId, isAdmin: false, direction: 'up' }),
    ).toBe('edge');
    expect(
      await moveLesson({ courseId, lessonId: bankQuizLessonId, instructorId, isAdmin: false, direction: 'down' }),
    ).toBe('edge');
    expect(
      await moveLesson({ courseId, lessonId: secondLessonId, instructorId: otherInstructorId, isAdmin: false, direction: 'up' }),
    ).toBe('not_found');
  });
});

describe('certificate desk', () => {
  it('lists issued certificates and flips the public verification state', async () => {
    const rows = await listAdminCertificates();
    const row = rows.find((certificate) => certificate.code === certificateCode);
    expect(row).toMatchObject({ studentEmail: 'student@example.com', courseSlug: 'javascript' });
    expect(row!.revokedAt).toBeNull();

    expect(await setCertificateRevoked(row!.id, true)).toBe(true);
    expect((await getCertificateByCode(certificateCode))?.revoked).toBe(true);
    expect(await setCertificateRevoked(row!.id, false)).toBe(true);
    expect((await getCertificateByCode(certificateCode))?.revoked).toBe(false);
  });
});

describe('question bank', () => {
  it('saves a question once and reuses it in another quiz', async () => {
    const question = await QuizQuestion.create({
      course: courseId,
      lesson: quizLessonId,
      prompt: 'Which keyword declares a constant?',
      type: 'single',
      options: ['const', 'let', 'var'],
      correctIndexes: [0],
      explanation: 'A const binding cannot be reassigned.',
      points: 2,
      order: 1,
    });

    expect(await saveQuestionToBank({ instructorId, questionId: String(question._id), isAdmin: false })).toBe('saved');
    expect(await saveQuestionToBank({ instructorId, questionId: String(question._id), isAdmin: false })).toBe('exists');
    expect(await saveQuestionToBank({ instructorId: otherInstructorId, questionId: String(question._id), isAdmin: false })).toBe(
      'not_found',
    );

    const bank = await listQuestionBank(instructorId);
    const saved = bank.find((row) => row.prompt === question.prompt);
    expect(saved).toMatchObject({ type: 'single', points: 2, explanation: 'A const binding cannot be reassigned.' });
    expect(saved!.sourceCourseTitle?.en).toBe('JavaScript');

    expect(
      await addBankItemToQuiz({ bankItemId: saved!.id, lessonId: bankQuizLessonId, instructorId, isAdmin: false }),
    ).toBe('added');
    expect(
      await addBankItemToQuiz({ bankItemId: saved!.id, lessonId: bankQuizLessonId, instructorId, isAdmin: false }),
    ).toBe('duplicate');

    const added = await QuizQuestion.findOne({ lesson: bankQuizLessonId, prompt: question.prompt }).lean();
    expect(added?.correctIndexes).toEqual([0]);
    expect(added?.explanation).toBe('A const binding cannot be reassigned.');
    expect(
      await addBankItemToQuiz({ bankItemId: saved!.id, lessonId: bankQuizLessonId, instructorId: otherInstructorId, isAdmin: false }),
    ).toBe('not_found');
  });
});

describe('coupon redemption timeline', () => {
  it('records a paid coupon order with its buyer and discount', async () => {
    const created = await createInstructorCoupon({
      instructorId,
      isAdmin: false,
      code: 'TIMELINE-10',
      type: 'fixed',
      value: 5000,
      courseId,
      maxRedemptions: 10,
      days: 30,
    });
    expect(created.ok).toBe(true);
    const order = await createOrderForCourses({
      userId: buyerId,
      courseIds: [courseId],
      couponCode: 'TIMELINE-10',
      idempotencyKey: 'timeline-order',
    });
    await markOrderPaid({
      orderId: order.orderNumber,
      provider: 'paybridge',
      providerRef: 'timeline-ref',
      eventId: 'timeline-event',
      eventType: 'payment.succeeded',
    });

    const timeline = await getCouponRedemptionTimeline();
    expect(timeline[0]).toMatchObject({
      orderNumber: order.orderNumber,
      code: 'TIMELINE-10',
      buyerEmail: 'buyer@example.com',
      discountPaisa: 5000,
      totalPaisa: 115000,
    });
  });
});

describe('automatic saved-search checks', () => {
  it('checks a stale search once, then waits for the interval', async () => {
    await Course.updateOne({ _id: otherCourseId }, { publishedAt: new Date(Date.now() - 1000) });
    expect(
      await createSavedSearch(lateLearnerId, { label: 'Python', query: 'Python', level: '', language: '', maxPricePaisa: null }),
    ).toBe('created');
    await SavedSearch.updateOne(
      { user: lateLearnerId, label: 'Python' },
      { lastCheckedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
    );

    const first = await checkDueSavedSearches(lateLearnerId, new Date());
    expect(first).toMatchObject({ checked: 1, newMatches: 1, skipped: false });
    const second = await checkDueSavedSearches(lateLearnerId, new Date());
    expect(second).toMatchObject({ checked: 0, newMatches: 0, skipped: true });
  });
});

describe('completion surveys', () => {
  it('accepts only a completed course and one 1-5 answer per scale', async () => {
    expect(
      await submitCompletionSurvey(activeStudentId, courseId, { difficulty: 3, pace: 3, confidence: 3, comment: '' }),
    ).toBe('not_completed');
    expect(
      await submitCompletionSurvey(studentId, courseId, { difficulty: 6, pace: 3, confidence: 3, comment: '' }),
    ).toBe('invalid');
    expect(
      await submitCompletionSurvey(studentId, otherCourseId, { difficulty: 3, pace: 3, confidence: 3, comment: '' }),
    ).toBe('not_completed');

    expect(
      await submitCompletionSurvey(studentId, courseId, {
        difficulty: 2,
        pace: 4,
        confidence: 5,
        comment: 'The projects made the ideas click.',
      }),
    ).toBe('saved');
    expect(
      await submitCompletionSurvey(studentId, courseId, { difficulty: 3, pace: 4, confidence: 5, comment: 'Edited answer' }),
    ).toBe('saved');
  });

  it('shows the learner their answer and gives the teacher anonymous averages', async () => {
    const courses = await getSurveyableCourses(studentId);
    expect(courses).toHaveLength(1);
    expect(courses[0]).toMatchObject({
      courseId,
      survey: { difficulty: 3, pace: 4, confidence: 5, comment: 'Edited answer' },
    });

    expect(await getCourseSurveySummary(courseId)).toMatchObject({ count: 1, difficulty: 3, pace: 4, confidence: 5 });
    expect((await getCourseSurveySummary(courseId)).comments).toHaveLength(1);
    expect((await getCourseSurveySummary(courseId)).comments[0]?.body).toBe('Edited answer');
    const roster = await getCourseRoster(courseId, instructorId, false);
    expect(roster!.students.find((row) => row.id === studentId)?.surveySubmitted).toBe(true);
    expect(roster!.survey).toMatchObject({ count: 1, difficulty: 3, pace: 4, confidence: 5 });
    expect(roster!.survey.comments[0]?.body).toBe('Edited answer');
  });
});

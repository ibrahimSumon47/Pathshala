import mongoose from 'mongoose';
import {
  Bookmark,
  Cart,
  Category,
  Coupon,
  Course,
  Enrolment,
  LearningEvent,
  Lesson,
  LiveSession,
  Note,
  Reminder,
  ensureRemindersForEnrolment,
  issueCertificateIfEligible,
  QuizQuestion,
  Review,
  Section,
  User,
  Wishlist,
  connectToDatabase,
} from '@pathshala/db';
import { SEED_CATEGORIES, SEED_COURSES, SEED_INSTRUCTORS } from './seed-content';

/** Seeded covers live in the web app's public folder, so a demo course always has art. */
const COURSE_COVERS: Record<string, string> = {
  'javascript-first-steps': '/images/courses/javascript-first-steps.jpg',
  'spoken-english-daily': '/images/courses/spoken-english-daily.jpg',
  'excel-for-office': '/images/courses/excel-for-office.jpg',
  'algebra-without-fear': '/images/courses/algebra-without-fear.jpg',
  'design-with-type': '/images/courses/design-with-type.jpg',
  'harmonium-first-raga': '/images/courses/harmonium-first-raga.jpg',
};

/** Two screenshots show what the preview gallery looks like on a real course page. */
const COURSE_PREVIEWS: Record<string, string[]> = {
  'javascript-first-steps': [
    '/images/courses/javascript-first-steps-editor.jpg',
    '/images/courses/javascript-first-steps-exercise.jpg',
  ],
};

const DEMO_HASHES: Record<string, string> = {
  'student@pathshala.dev': '$2b$10$4BV/E4MkmJgoW9KFxDQrXugLGeVtUpjSVrNSuuNQynaIUKTLL6kaq', // nosemgrep: generic.secrets.security.detected-bcrypt-hash.detected-bcrypt-hash -- published demo password
  'instructor@pathshala.dev': '$2b$10$MIxFtDABNO2BmG/WOS/y1uMsN0VW2PLUzr626crJu5gcnymF8F7fW', // nosemgrep: generic.secrets.security.detected-bcrypt-hash.detected-bcrypt-hash -- published demo password
  'admin@pathshala.dev': '$2b$10$/KV7QxcTwEPz3n7WcqyfcOCKkeFWNm1n177rckHovZvisY/fzrz9m', // nosemgrep: generic.secrets.security.detected-bcrypt-hash.detected-bcrypt-hash -- published demo password
};

/** Build the bilingual list shape used by outcomes, requirements and audience. */
function localized(bn: string[], en: string[]) {
  const count = Math.max(bn.length, en.length);
  return Array.from({ length: count }, (_, index) => ({
    ...(bn[index] ? { bn: bn[index] } : {}),
    ...(en[index] ? { en: en[index] } : {}),
  }));
}

/** Insert the demo people and catalogue once, idempotently by email and slug. */
export async function seedDatabase(): Promise<void> {
  await connectToDatabase();

  const people = [
    {
      name: 'Nusrat Jahan',
      email: 'student@pathshala.dev',
      roles: ['student'] as const,
      locale: 'bn' as const,
      headline: 'প্রতিদিন একটু একটু করে শিখছি',
      headlineEn: 'Learning a little every day',
    },
    {
      name: 'Rafiqul Islam',
      email: 'instructor@pathshala.dev',
      roles: ['instructor'] as const,
      locale: 'bn' as const,
      headline: 'ওয়েব ডেভেলপার ও প্রশিক্ষক',
      headlineEn: 'Web developer and teacher',
    },
    {
      name: 'Tania Rahman',
      email: 'admin@pathshala.dev',
      roles: ['admin'] as const,
      locale: 'bn' as const,
      headline: 'প্ল্যাটফর্ম পরিচালনা ও কোর্স অনুমোদন',
      headlineEn: 'Keeps the school running and approves courses',
    },
  ];

  const userIds = new Map<string, mongoose.Types.ObjectId>();
  for (const person of people) {
    const document = await User.findOneAndUpdate(
      { email: person.email },
      { ...person, passwordHash: DEMO_HASHES[person.email], isDemo: true, emailVerified: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    userIds.set(person.email, document._id);
  }

  // Instructor profiles: the seed bio is short on purpose, the way a real profile reads.
  for (const instructor of SEED_INSTRUCTORS) {
    const existing = userIds.get(instructor.email);
    if (!existing) continue;
    await User.updateOne(
      { _id: existing },
      { bio: instructor.bio, bioEn: instructor.bioEn, headline: instructor.headline, headlineEn: instructor.headlineEn, image: instructor.image, isDemo: true },
    );
  }

  const categoryIds = new Map<string, mongoose.Types.ObjectId>();
  for (const category of SEED_CATEGORIES) {
    const document = await Category.findOneAndUpdate(
      { slug: category.slug },
      {
        slug: category.slug,
        name: { bn: category.bn, en: category.en },
        description: { bn: `${category.bn} বিষয়ের কোর্স`, en: `${category.en} courses` },
        order: category.order,
        isActive: true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    categoryIds.set(category.slug, document._id);
  }

  const instructorId = userIds.get('instructor@pathshala.dev');
  if (!instructorId) throw new Error('Instructor seed failed');

  for (const course of SEED_COURSES) {
    const categoryId = categoryIds.get(course.category);
    if (!categoryId) throw new Error(`Missing category ${course.category}`);

    const document = await Course.findOneAndUpdate(
      { slug: course.slug },
      {
        slug: course.slug,
        title: { bn: course.titleBn, en: course.titleEn },
        subtitle: { bn: course.subtitleBn, en: course.subtitleEn },
        shortDescription: { bn: course.shortBn, en: course.shortEn },
        description: { bn: course.descriptionBn, en: course.descriptionEn },
        category: categoryId,
        instructor: instructorId,
        language: course.language,
        level: course.level,
        pricePaisa: course.pricePaisa,
        salePricePaisa: null,
        status: 'published',
        outcomes: localized(course.outcomesBn, course.outcomesEn),
        requirements: localized(course.requirementsBn, course.requirementsEn),
        audience: localized(course.audienceBn, course.audienceEn),
        faqs: course.faqs.map((faq) => ({
          question: { bn: faq.questionBn, en: faq.questionEn },
          answer: { bn: faq.answerBn, en: faq.answerEn },
        })),
        ...(COURSE_COVERS[course.slug] ? { thumbnailUrl: COURSE_COVERS[course.slug] } : {}),
        previewImageUrls: COURSE_PREVIEWS[course.slug] ?? [],
        isDemo: true,
        ratingAverage: 0,
        ratingCount: 0,
        enrolmentCount: 0,
        publishedAt: new Date('2026-11-10T10:00:00Z'),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    // Rebuild the outline so a seeded course always matches this file.
    await Lesson.deleteMany({ course: document._id });
    await Section.deleteMany({ course: document._id });

    for (const [sectionIndex, section] of course.sections.entries()) {
      const sectionDocument = await Section.create({
        course: document._id,
        order: sectionIndex + 1,
        title: { bn: section.titleBn, en: section.titleEn },
      });

      for (const [lessonIndex, lesson] of section.lessons.entries()) {
        await Lesson.create({
          course: document._id,
          section: sectionDocument._id,
          order: lessonIndex + 1,
          title: { bn: lesson.titleBn, en: lesson.titleEn },
          type: 'reading',
          content: {
            bodyHtml: course.language === 'bn' ? lesson.bodyBn : lesson.bodyEn,
            attachments: [],
          },
          video: null,
          isPreview: Boolean(lesson.isPreview),
          durationMinutes: lesson.durationMinutes,
        });
      }
    }
  }

  const studentId = userIds.get('student@pathshala.dev');
  const programming = await Course.findOne({ slug: 'javascript-first-steps' });
  const english = await Course.findOne({ slug: 'spoken-english-daily' });
  const excel = await Course.findOne({ slug: 'excel-for-office' });
  if (!studentId || !programming || !english) throw new Error('Demo learning seed failed');

  const quizSection = await Section.findOne({ course: programming._id, order: 2 });
  if (!quizSection) throw new Error('Demo section missing');
  const quiz = await Lesson.findOneAndUpdate(
    { course: programming._id, section: quizSection._id, order: 3 },
    {
      course: programming._id,
      section: quizSection._id,
      order: 3,
      title: { bn: 'ছোট কুইজ', en: 'A short quiz' },
      type: 'quiz',
      content: { bodyHtml: '<p>Answer all questions, then submit.</p>', attachments: [] },
      video: null,
      isPreview: false,
      durationMinutes: 10,
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  );
  await QuizQuestion.deleteMany({ lesson: quiz._id });
  await QuizQuestion.create([
    {
      course: programming._id,
      lesson: quiz._id,
      prompt: 'Which keyword declares a variable that cannot be reassigned?',
      type: 'single',
      options: ['const', 'let', 'var', 'function'],
      correctIndexes: [0],
      points: 1,
      order: 1,
    },
    {
      course: programming._id,
      lesson: quiz._id,
      prompt: 'Which values are strings?',
      type: 'multiple',
      options: ['"hello"', '42', "'pathshala'", 'true'],
      correctIndexes: [0, 2],
      points: 2,
      order: 2,
    },
  ]);

  const firstLesson = await Lesson.findOne({ course: programming._id }).sort({ order: 1 });
  const completedLessons = await Lesson.find({ course: programming._id }).select('_id').lean();
  await Enrolment.findOneAndUpdate(
    { student: studentId, course: programming._id },
    {
      $set: {
        status: 'completed',
        completedLessonIds: completedLessons.map((lesson) => lesson._id),
        progressPercent: 100,
        lastLessonId: firstLesson?._id ?? null,
        lastSeenAt: new Date('2026-11-16T09:00:00Z'),
        completedAt: new Date('2026-11-15T09:00:00Z'),
      },
      $setOnInsert: { enrolledAt: new Date('2026-11-12T09:00:00Z') },
    },
    { upsert: true, returnDocument: 'after' },
  );
  await issueCertificateIfEligible(studentId, String(programming._id));

  // A short study history gives the demo dashboard a real streak and a first badge.
  await LearningEvent.deleteMany({ student: studentId });
  const studyDays = [0, 1, 2];
  for (const [index, lesson] of completedLessons.entries()) {
    const day = studyDays[index % studyDays.length] ?? 0;
    await LearningEvent.create({
      student: studentId,
      course: programming._id,
      lesson: lesson._id,
      type: 'lesson_completed',
      occurredAt: new Date(Date.now() - day * 24 * 60 * 60 * 1000),
    });
  }
  if (studentId) {
    await Bookmark.findOneAndUpdate(
      { student: studentId, lesson: firstLesson?._id },
      { $setOnInsert: { course: programming._id } },
      { upsert: true },
    );
    const designCourse = await Course.findOne({ slug: 'design-with-type' }).select('_id').lean();
    if (designCourse) {
      await Cart.findOneAndUpdate(
        { user: studentId },
        { $setOnInsert: { courses: [designCourse._id] } },
        { upsert: true },
      );
    }
  }

  await Review.findOneAndUpdate(
    { student: studentId, course: programming._id },
    { rating: 5, body: 'প্রথম পাঠটা সহজ করে লেখা, আর কাজটা ছোট ছিল।' },
    { upsert: true, returnDocument: 'after' },
  );
  await Wishlist.findOneAndUpdate(
    { student: studentId, course: english._id },
    { $setOnInsert: { createdAt: new Date() } },
    { upsert: true },
  );
  if (firstLesson) {
    await Note.findOneAndUpdate(
      { student: studentId, lesson: firstLesson._id },
      { course: programming._id, body: 'কনস্ট দিয়ে শুরু করা যায়, পরে দরকার হলে লেট।' },
      { upsert: true },
    );
  }
  // Two more honest demo opinions keep the best-rated shelf from showing a single card.
  const extraReviews = [
    { course: english._id, rating: 5, body: 'প্রতিদিন পাঁচ মিনিট বলার অভ্যাসটা এখান থেকেই শুরু।' },
    ...(excel ? [{ course: excel._id, rating: 4, body: 'অফিসের শিটগুলো এখন অনেক দ্রুত শেষ হয়।' }] : []),
  ];
  for (const review of extraReviews) {
    await Review.findOneAndUpdate(
      { student: studentId, course: review.course },
      { rating: review.rating, body: review.body },
      { upsert: true },
    );
    const ratings = await Review.find({ course: review.course }).select('rating').lean();
    await Course.findByIdAndUpdate(review.course, {
      ratingAverage: ratings.reduce((total, item) => total + item.rating, 0) / Math.max(1, ratings.length),
      ratingCount: ratings.length,
    });
  }
  const ratings = await Review.find({ course: programming._id }).select('rating').lean();
  await Course.findByIdAndUpdate(programming._id, {
    ratingAverage: ratings.reduce((total, review) => total + review.rating, 0) / Math.max(1, ratings.length),
    ratingCount: ratings.length,
    enrolmentCount: 1,
  });
  await Course.findByIdAndUpdate(english._id, { enrolmentCount: 1 });

  const live = await LiveSession.findOneAndUpdate(
    { roomName: 'pathshala-demo-live' },
    {
      course: programming._id,
      instructor: programming.instructor,
      title: { bn: 'প্রশ্ন-উত্তর সেশন', en: 'Questions and answers' },
      description: {
        bn: 'প্রথম সপ্তাহের প্রশ্ন নিয়ে সরাসরি কথা।',
        en: 'A live hour for questions from the first week.',
      },
      startsAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      durationMinutes: 60,
      roomName: 'pathshala-demo-live',
      status: 'scheduled',
    },
    { upsert: true, returnDocument: 'after' },
  );
  await Reminder.deleteMany({ session: live._id, student: studentId });
  await ensureRemindersForEnrolment(studentId, String(programming._id));

  const adminId = userIds.get('admin@pathshala.dev');
  if (adminId) {
    await Coupon.findOneAndUpdate(
      { code: 'EARLYBIRD' },
      {
        code: 'EARLYBIRD',
        type: 'percent',
        value: 20,
        minAmountPaisa: 0,
        maxRedemptions: 100,
        maxPerLearner: 1,
        active: true,
        createdBy: adminId,
        expiresAt: new Date('2027-12-31T23:59:59Z'),
      },
      { upsert: true, returnDocument: 'after' },
    );
  }
}

if (process.argv[1]?.endsWith('seed.ts')) {
  void seedDatabase()
    .then(async () => {
      console.log('Seed complete');
      await mongoose.disconnect();
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exit(1);
    });
}

import mongoose from 'mongoose';
import {
  Category,
  Coupon,
  Course,
  Enrolment,
  Lesson,
  LiveSession,
  Note,
  Reminder,
  ensureRemindersForEnrolment,
  QuizQuestion,
  Review,
  Section,
  User,
  Wishlist,
  connectToDatabase,
} from '@pathshala/db';

const DEMO_HASHES: Record<string, string> = {
  'student@pathshala.dev': '$2b$10$4BV/E4MkmJgoW9KFxDQrXugLGeVtUpjSVrNSuuNQynaIUKTLL6kaq',
  'instructor@pathshala.dev': '$2b$10$MIxFtDABNO2BmG/WOS/y1uMsN0VW2PLUzr626crJu5gcnymF8F7fW',
  'admin@pathshala.dev': '$2b$10$/KV7QxcTwEPz3n7WcqyfcOCKkeFWNm1n177rckHovZvisY/fzrz9m',
};

type SeedCategory = { slug: string; bn: string; en: string; order: number };
type SeedCourse = {
  slug: string;
  category: string;
  titleBn: string;
  titleEn: string;
  subtitleBn: string;
  subtitleEn: string;
  descriptionBn: string;
  descriptionEn: string;
  pricePaisa: number;
  level: 'beginner' | 'intermediate' | 'advanced';
  language: 'bn' | 'en';
  outcomes: string[];
  requirements: string[];
};

const CATEGORIES: SeedCategory[] = [
  { slug: 'programming', bn: 'প্রোগ্রামিং', en: 'Programming', order: 1 },
  { slug: 'english', bn: 'ইংরেজি', en: 'English', order: 2 },
  { slug: 'office', bn: 'অফিস ও এক্সেল', en: 'Office and Excel', order: 3 },
  { slug: 'mathematics', bn: 'গণিত', en: 'Mathematics', order: 4 },
  { slug: 'design', bn: 'ডিজাইন', en: 'Design', order: 5 },
  { slug: 'music', bn: 'সংগীত', en: 'Music', order: 6 },
];

const COURSES: SeedCourse[] = [
  {
    slug: 'javascript-first-steps',
    category: 'programming',
    titleBn: 'জাভাস্ক্রিপ্টের প্রথম ধাপ',
    titleEn: 'First Steps in JavaScript',
    subtitleBn: 'ব্রাউজারে চলে এমন ছোট প্রোগ্রাম তৈরি করুন',
    subtitleEn: 'Build small programs that run in the browser',
    descriptionBn:
      'ভেরিয়েবল, শর্ত, লুপ আর ফাংশন দিয়ে শুরু করুন। প্রতিটি পাঠে ছোট একটা কাজ করেন, আর শেষে একটি হিসাবরক্ষক অ্যাপ বানান।',
    descriptionEn:
      'Start with variables, conditions, loops and functions. Each lesson ends with a small task, and the course finishes with a working expense tracker.',
    pricePaisa: 0,
    level: 'beginner',
    language: 'bn',
    outcomes: ['Read and write basic JavaScript', 'Build a small browser app', 'Debug with the console'],
    requirements: ['A computer with a browser', 'No prior programming experience'],
  },
  {
    slug: 'spoken-english-daily',
    category: 'english',
    titleBn: 'প্রতিদিনের ইংরেজি কথা',
    titleEn: 'Everyday Spoken English',
    subtitleBn: 'অফিস, বাজার আর আড্ডায় আত্মবিশ্বাসী হোন',
    subtitleEn: 'Speak with confidence at work, at the market and with friends',
    descriptionBn:
      'প্রতিদিনের পরিস্থিতিতে দরকারি বাক্য, উচ্চারণ আর ছোট সংলাপ। মুখে বলার অভ্যাসই এই কোর্সের মূল কাজ।',
    descriptionEn:
      'Useful sentences, pronunciation and short dialogues for everyday situations. The core work is speaking out loud, not memorising rules.',
    pricePaisa: 120000,
    level: 'beginner',
    language: 'bn',
    outcomes: ['Handle everyday conversations', 'Ask and answer common questions', 'Speak with clearer rhythm'],
    requirements: ['Comfort reading simple English', 'A quiet place to practise aloud'],
  },
  {
    slug: 'excel-for-office',
    category: 'office',
    titleBn: 'অফিসের কাজে এক্সেল',
    titleEn: 'Excel for Office Work',
    subtitleBn: 'হিসাব, তালিকা আর রিপোর্ট গুছিয়ে ফেলুন',
    subtitleEn: 'Organise numbers, lists and reports without the mess',
    descriptionBn:
      'সূত্র, ফিল্টার, পিভট টেবিল আর ছাপার উপযোগী রিপোর্ট। বাস্তব অফিসের শীট নিয়েই কাজ করা হবে।',
    descriptionEn:
      'Formulas, filters, pivot tables and print-ready reports. You will work with realistic office sheets rather than toy examples.',
    pricePaisa: 150000,
    level: 'intermediate',
    language: 'bn',
    outcomes: ['Write reliable formulas', 'Summarise data with pivot tables', 'Prepare a clean printable report'],
    requirements: ['Excel 2016 or newer', 'Basic keyboard skills'],
  },
  {
    slug: 'algebra-without-fear',
    category: 'mathematics',
    titleBn: 'ভয় ছাড়া বীজগণিত',
    titleEn: 'Algebra Without Fear',
    subtitleBn: 'সমীকরণ বুঝুন, মুখস্থ নয়',
    subtitleEn: 'Understand equations instead of memorising steps',
    descriptionBn:
      'বীজগণিতের ধারণাগুলো ছবি আর ছোট ধাপে বুঝুন। প্রতিটি অধ্যায়ে অনুশীলনী আর সমাধানের ব্যাখ্যা আছে।',
    descriptionEn:
      'Learn algebraic ideas through pictures and short steps. Every chapter has practice problems and worked explanations.',
    pricePaisa: 90000,
    level: 'beginner',
    language: 'bn',
    outcomes: ['Solve linear equations', 'Work confidently with fractions', 'Explain each step of a solution'],
    requirements: ['Arithmetic with whole numbers', 'A notebook for practice'],
  },
  {
    slug: 'design-with-type',
    category: 'design',
    titleBn: 'টাইপ দিয়ে ডিজাইন',
    titleEn: 'Design with Type',
    subtitleBn: 'সাদামাটা লেখাকে সুন্দর করে সাজান',
    subtitleEn: 'Make plain words look considered and clear',
    descriptionBn:
      'অক্ষরের মাপ, ফাঁক, রং আর গ্রিড। কোনো বিশেষ সফটওয়্যার ছাড়াই কাগজে আর স্ক্রিনে কাজ করা যাবে।',
    descriptionEn:
      'Type size, spacing, colour and grids. The exercises work on paper and on screen, without requiring a particular design app.',
    pricePaisa: 180000,
    level: 'intermediate',
    language: 'en',
    outcomes: ['Choose type sizes with a reason', 'Build a simple visual hierarchy', 'Lay out a one-page poster'],
    requirements: ['A browser or paper and pencil', 'No design software required'],
  },
  {
    slug: 'harmonium-first-raga',
    category: 'music',
    titleBn: 'হারমোনিয়ামে প্রথম রাগ',
    titleEn: 'Your First Raga on Harmonium',
    subtitleBn: 'সুর, তাল আর প্রতিদিনের অভ্যাস',
    subtitleEn: 'Melody, rhythm and a practice you can keep',
    descriptionBn:
      'হারমোনিয়াম ধরার নিয়ম থেকে শুরু করে একটি সহজ রাগ। প্রতিটি পাঠে শোনা, গুনে বলা আর বাজানোর পালা।',
    descriptionEn:
      'Start with how to hold the harmonium and learn one simple raga. Each lesson alternates listening, counting aloud and playing.',
    pricePaisa: 100000,
    level: 'beginner',
    language: 'bn',
    outcomes: ['Play a simple raga', 'Keep a steady rhythm', 'Practise without straining your hands'],
    requirements: ['Access to a harmonium', 'Fifteen minutes a day'],
  },
];

/** Insert the demo people and catalogue once, idempotently by email and slug. */
export async function seedDatabase(): Promise<void> {
  await connectToDatabase();

  const people = [
    { name: 'Nusrat Jahan', email: 'student@pathshala.dev', roles: ['student'] as const, locale: 'bn' as const },
    { name: 'Rafiqul Islam', email: 'instructor@pathshala.dev', roles: ['instructor'] as const, locale: 'bn' as const },
    { name: 'Tania Rahman', email: 'admin@pathshala.dev', roles: ['admin'] as const, locale: 'bn' as const },
  ];

  const userIds = new Map<string, mongoose.Types.ObjectId>();
  for (const person of people) {
    const document = await User.findOneAndUpdate(
      { email: person.email },
      { ...person, passwordHash: DEMO_HASHES[person.email], emailVerified: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    userIds.set(person.email, document._id);
  }

  const categoryIds = new Map<string, mongoose.Types.ObjectId>();
  for (const category of CATEGORIES) {
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

  for (const course of COURSES) {
    const categoryId = categoryIds.get(course.category);
    if (!categoryId) throw new Error(`Missing category ${course.category}`);

    const document = await Course.findOneAndUpdate(
      { slug: course.slug },
      {
        slug: course.slug,
        title: { bn: course.titleBn, en: course.titleEn },
        subtitle: { bn: course.subtitleBn, en: course.subtitleEn },
        description: { bn: course.descriptionBn, en: course.descriptionEn },
        category: categoryId,
        instructor: instructorId,
        language: course.language,
        level: course.level,
        pricePaisa: course.pricePaisa,
        salePricePaisa: null,
        status: 'published',
        outcomes: course.outcomes,
        requirements: course.requirements,
        ratingAverage: 4.7,
        ratingCount: 12,
        enrolmentCount: 18,
        publishedAt: new Date('2026-11-10T10:00:00Z'),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    const section = await Section.findOneAndUpdate(
      { course: document._id, order: 1 },
      {
        course: document._id,
        order: 1,
        title: { bn: 'শুরু করার আগে', en: 'Before you begin' },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    const lessons = [
      {
        titleBn: 'কোর্সটি কীভাবে করবেন',
        titleEn: 'How to work through this course',
        bodyBn: '<p>প্রতিটি পাঠে একটি ছোট কাজ আছে। কাজটি শেষ করে পরের পাঠে যান।</p>',
        bodyEn: '<p>Every lesson has one small task. Finish it before moving on.</p>',
      },
      {
        titleBn: 'প্রথম অনুশীলন',
        titleEn: 'Your first exercise',
        bodyBn: '<p>আজকের কাজটি খাতায় লিখুন, তারপর নিজের ভাষায় ব্যাখ্যা করুন।</p>',
        bodyEn: '<p>Write today’s task in a notebook, then explain it in your own words.</p>',
      },
    ];

    for (const [index, lesson] of lessons.entries()) {
      await Lesson.findOneAndUpdate(
        { course: document._id, section: section._id, order: index + 1 },
        {
          course: document._id,
          section: section._id,
          order: index + 1,
          title: { bn: lesson.titleBn, en: lesson.titleEn },
          type: 'reading',
          content: {
            bodyHtml: course.language === 'bn' ? lesson.bodyBn : lesson.bodyEn,
            attachments: [],
          },
          video: null,
          isPreview: index === 0,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    }
  }

  const studentId = userIds.get('student@pathshala.dev');
  const programming = await Course.findOne({ slug: 'javascript-first-steps' });
  const english = await Course.findOne({ slug: 'spoken-english-daily' });
  if (!studentId || !programming || !english) throw new Error('Demo learning seed failed');

  const section = await Section.findOne({ course: programming._id, order: 1 });
  if (!section) throw new Error('Demo section missing');
  const quiz = await Lesson.findOneAndUpdate(
    { course: programming._id, section: section._id, order: 3 },
    {
      course: programming._id,
      section: section._id,
      order: 3,
      title: { bn: 'ছোট কুইজ', en: 'A short quiz' },
      type: 'quiz',
      content: { bodyHtml: '<p>Answer all questions, then submit.</p>', attachments: [] },
      video: null,
      isPreview: false,
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

  const firstLesson = await Lesson.findOne({ course: programming._id, order: 1 });
  await Enrolment.findOneAndUpdate(
    { student: studentId, course: programming._id },
    {
      $setOnInsert: {
        status: 'active',
        completedLessonIds: firstLesson ? [firstLesson._id] : [],
        progressPercent: firstLesson ? 33 : 0,
        enrolledAt: new Date('2026-11-12T09:00:00Z'),
      },
    },
    { upsert: true, returnDocument: 'after' },
  );
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
  await Course.findByIdAndUpdate(programming._id, { ratingAverage: 5, ratingCount: 1 });

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
      startsAt: new Date(Date.now() + 30 * 60 * 1000),
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

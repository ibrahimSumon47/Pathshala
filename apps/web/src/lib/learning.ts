import 'server-only';
import type { UserRole } from '@pathshala/db';
import {
  Course,
  Enrolment,
  Lesson,
  Note,
  Question,
  QuizAttempt,
  QuizQuestion,
  Review,
  Section,
  User,
  Wishlist,
  connectToDatabase,
} from '@pathshala/db';

type Localized = { bn?: string; en?: string };

export type LearningLesson = {
  id: string;
  title: Localized;
  type: 'reading' | 'video' | 'quiz';
  bodyHtml: string;
  attachments: Array<{ name: string; url: string; mimeType: string; sizeBytes: number }>;
  isPreview: boolean;
  videoUrl: string;
};

export type LearningSection = { id: string; title: Localized; lessons: LearningLesson[] };

export type LearningCourse = {
  id: string;
  slug: string;
  title: Localized;
  subtitle: Localized;
  instructorId: string;
  instructorName: string;
  pricePaisa: number;
  sections: LearningSection[];
  lessons: LearningLesson[];
  hasAccess: boolean;
  completedLessonIds: string[];
  progressPercent: number;
  status: 'active' | 'completed' | 'refunded' | null;
};

type LoadArgs = { slug: string; userId: string; roles: UserRole[] };

/** Load one course for the learning screen and decide access from the enrolment record. */
export async function getLearningCourse({ slug, userId, roles }: LoadArgs): Promise<LearningCourse | null> {
  await connectToDatabase();
  const course = await Course.findOne({ slug, status: 'published' }).lean();
  if (!course) return null;

  const [sections, lessons, instructor, enrolment] = await Promise.all([
    Section.find({ course: course._id }).sort({ order: 1 }).lean(),
    Lesson.find({ course: course._id }).sort({ order: 1 }).lean(),
    User.findById(course.instructor).select('name').lean(),
    Enrolment.findOne({ student: userId, course: course._id }).lean(),
  ]);

  const isOwner = roles.includes('admin') || String(course.instructor) === userId;
  const hasAccess = isOwner || Boolean(enrolment && enrolment.status !== 'refunded');
  const completedLessonIds = enrolment?.completedLessonIds.map(String) ?? [];

  return {
    id: String(course._id),
    slug: course.slug,
    title: course.title,
    subtitle: course.subtitle ?? {},
    instructorId: String(course.instructor),
    instructorName: instructor?.name ?? '',
    pricePaisa: course.pricePaisa,
    hasAccess,
    completedLessonIds,
    progressPercent: enrolment?.progressPercent ?? 0,
    status: enrolment?.status ?? null,
    sections: sections.map((section) => ({
      id: String(section._id),
      title: section.title,
      lessons: lessons
        .filter((lesson) => String(lesson.section) === String(section._id))
        .map((lesson) => toLearningLesson(lesson as unknown as LessonRow)),
    })),
    lessons: lessons.map((lesson) => toLearningLesson(lesson as unknown as LessonRow)),
  };
}

type LessonRow = {
  _id: unknown;
  title: Localized;
  type: 'reading' | 'video' | 'quiz';
  content: { bodyHtml?: string; attachments: LearningLesson['attachments'] };
  isPreview: boolean;
  video?: { url?: string } | null;
};

/** Map a Mongo lesson to the safe shape the learning screen renders. */
function toLearningLesson(row: LessonRow): LearningLesson {
  return {
    id: String(row._id),
    title: row.title,
    type: row.type,
    bodyHtml: row.content.bodyHtml ?? '',
    attachments: row.content.attachments,
    isPreview: row.isPreview,
    videoUrl: row.video?.url ?? '',
  };
}

export type ReviewView = { id: string; author: string; rating: number; body: string; createdAt: string };

/** Reviews for the public page, newest first, with the author's display name. */
export async function getCourseReviews(courseId: string): Promise<ReviewView[]> {
  await connectToDatabase();
  const reviews = await Review.find({ course: courseId }).sort({ createdAt: -1 }).limit(20).lean();
  const authors = await User.find({ _id: { $in: reviews.map((review) => review.student) } })
    .select('name')
    .lean();
  const names = new Map(authors.map((author) => [String(author._id), author.name]));
  return reviews.map((review) => ({
    id: String(review._id),
    author: names.get(String(review.student)) ?? 'Learner',
    rating: review.rating,
    body: review.body,
    createdAt: review.createdAt.toISOString(),
  }));
}

export type DashboardCourse = {
  id: string;
  slug: string;
  title: Localized;
  progressPercent: number;
  status: string;
  lessonCount: number;
};

/** Everything the dashboard needs: active enrolments and saved courses. */
export async function getDashboardLearning(userId: string): Promise<{
  courses: DashboardCourse[];
  wishlist: Array<{ id: string; slug: string; title: Localized; pricePaisa: number }>;
  certificateCount: number;
}> {
  await connectToDatabase();
  const [enrolments, wishlist] = await Promise.all([
    Enrolment.find({ student: userId }).sort({ updatedAt: -1 }).limit(20).lean(),
    Wishlist.find({ student: userId }).sort({ createdAt: -1 }).limit(20).lean(),
  ]);
  const courseIds = [...new Set([...enrolments.map((row) => String(row.course)), ...wishlist.map((row) => String(row.course))])];
  const [courses, lessonCounts] = await Promise.all([
    Course.find({ _id: { $in: courseIds } }).select('slug title pricePaisa').lean(),
    Lesson.aggregate<{ _id: string; count: number }>([
      { $match: { course: { $in: courseIds } } },
      { $group: { _id: '$course', count: { $sum: 1 } } },
    ]),
  ]);
  const courseMap = new Map(courses.map((course) => [String(course._id), course]));
  const countMap = new Map(lessonCounts.map((row) => [String(row._id), row.count]));

  return {
    courses: enrolments.flatMap((enrolment) => {
      const course = courseMap.get(String(enrolment.course));
      if (!course) return [];
      return [
        {
          id: String(course._id),
          slug: course.slug,
          title: course.title,
          progressPercent: enrolment.progressPercent,
          status: enrolment.status,
          lessonCount: countMap.get(String(course._id)) ?? 0,
        },
      ];
    }),
    wishlist: wishlist.flatMap((entry) => {
      const course = courseMap.get(String(entry.course));
      if (!course) return [];
      return [{ id: String(course._id), slug: course.slug, title: course.title, pricePaisa: course.pricePaisa }];
    }),
    certificateCount: 0,
  };
}

export type QuizView = {
  questions: Array<{ id: string; prompt: string; type: string; options: string[]; points: number }>;
  lastAttempt: { score: number; maxScore: number; passed: boolean } | null;
};

/** Questions are public inside the lesson; correct indexes are checked only on submit. */
export async function getLessonQuiz(lessonId: string, userId: string): Promise<QuizView> {
  await connectToDatabase();
  const [questions, attempt] = await Promise.all([
    QuizQuestion.find({ lesson: lessonId }).sort({ order: 1 }).lean(),
    QuizAttempt.findOne({ lesson: lessonId, student: userId }).sort({ createdAt: -1 }).lean(),
  ]);
  return {
    questions: questions.map((question) => ({
      id: String(question._id),
      prompt: question.prompt,
      type: question.type,
      options: question.options,
      points: question.points,
    })),
    lastAttempt: attempt ? { score: attempt.score, maxScore: attempt.maxScore, passed: attempt.passed } : null,
  };
}

export type NoteView = { id: string; body: string; updatedAt: string } | null;

/** One note per student per lesson. */
export async function getLessonNote(lessonId: string, userId: string): Promise<NoteView> {
  await connectToDatabase();
  const note = await Note.findOne({ lesson: lessonId, student: userId }).lean();
  return note ? { id: String(note._id), body: note.body, updatedAt: note.updatedAt.toISOString() } : null;
}

export type QuestionView = {
  id: string;
  body: string;
  author: string;
  createdAt: string;
  answers: Array<{ author: string; body: string; createdAt: string }>;
};

/** Lesson Q&A threads with author names resolved in one query. */
export async function getLessonQuestions(lessonId: string): Promise<QuestionView[]> {
  await connectToDatabase();
  const questions = await Question.find({ lesson: lessonId }).sort({ createdAt: -1 }).limit(30).lean();
  const ids = questions.flatMap((question) => [question.author, ...question.answers.map((answer) => answer.author)]);
  const users = await User.find({ _id: { $in: ids } }).select('name').lean();
  const names = new Map(users.map((user) => [String(user._id), user.name]));
  return questions.map((question) => ({
    id: String(question._id),
    body: question.body,
    author: names.get(String(question.author)) ?? 'Learner',
    createdAt: question.createdAt.toISOString(),
    answers: question.answers.map((answer) => ({
      author: names.get(String(answer.author)) ?? 'Teacher',
      body: answer.body,
      createdAt: answer.createdAt.toISOString(),
    })),
  }));
}

/** Enrolment and wishlist state for the public course page call to action. */
export async function getCourseViewerState(
  courseId: string,
  userId: string,
): Promise<{ enrolled: boolean; wishlisted: boolean }> {
  await connectToDatabase();
  const [enrolment, wishlisted] = await Promise.all([
    Enrolment.exists({ student: userId, course: courseId, status: { $ne: 'refunded' } }),
    Wishlist.exists({ student: userId, course: courseId }),
  ]);
  return { enrolled: Boolean(enrolment), wishlisted: Boolean(wishlisted) };
}

/** True when the user may read or write course-scoped learning data. */
export async function canAccessCourse(courseId: string, userId: string, roles: UserRole[]): Promise<boolean> {
  await connectToDatabase();
  const course = await Course.findById(courseId).select('instructor status').lean();
  if (!course) return false;
  if (roles.includes('admin') || String(course.instructor) === userId) return true;
  if (course.status !== 'published') return false;
  const enrolment = await Enrolment.exists({ student: userId, course: courseId, status: { $ne: 'refunded' } });
  return Boolean(enrolment);
}

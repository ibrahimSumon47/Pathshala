import { Types } from 'mongoose';
import { connectToDatabase } from './connection';
import { Course } from './models/course';
import { Enrolment } from './models/enrolment';
import { Lesson } from './models/lesson';
import { Notification } from './models/notification';
import { Question } from './models/question';
import { Review } from './models/review';
import { User } from './models/user';

type Localized = { bn?: string; en?: string };

export type InstructorReviewRow = {
  id: string;
  courseTitle: Localized;
  author: string;
  rating: number;
  body: string;
  replyBody: string;
  repliedAt: string | null;
  createdAt: string;
};

export type InstructorCommunity = {
  courses: Array<{ id: string; title: Localized; slug: string }>;
  reviews: InstructorReviewRow[];
};

/** The teacher's own course list plus visible reviews they can answer. */
export async function getInstructorCommunity(instructorId: string, isAdmin = false): Promise<InstructorCommunity> {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(instructorId)) return { courses: [], reviews: [] };
  const filter = isAdmin ? {} : { instructor: instructorId };
  const courses = await Course.find(filter)
    .select('title slug instructor')
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  const owned = isAdmin ? courses : courses.filter((course) => String(course.instructor) === instructorId);
  if (owned.length === 0) return { courses: [], reviews: [] };

  const reviews = await Review.find({ course: { $in: owned.map((course) => course._id) }, hidden: { $ne: true } })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
  const authors = await User.find({ _id: { $in: reviews.map((review) => review.student) } })
    .select('name')
    .lean();
  const names = new Map(authors.map((author) => [String(author._id), author.name]));
  const titles = new Map(owned.map((course) => [String(course._id), course.title]));

  return {
    courses: owned.map((course) => ({ id: String(course._id), title: course.title, slug: course.slug })),
    reviews: reviews.map((review) => ({
      id: String(review._id),
      courseTitle: titles.get(String(review.course)) ?? {},
      author: names.get(String(review.student)) ?? 'Learner',
      rating: review.rating,
      body: review.body,
      replyBody: review.replyBody ?? '',
      repliedAt: review.repliedAt?.toISOString() ?? null,
      createdAt: review.createdAt.toISOString(),
    })),
  };
}

/** Save or replace the instructor's public answer to one review. */
export async function replyToCourseReview(input: {
  reviewId: string;
  instructorId: string;
  isAdmin: boolean;
  body: string;
}): Promise<boolean> {
  await connectToDatabase();
  const body = input.body.trim().slice(0, 1200);
  if (!Types.ObjectId.isValid(input.reviewId) || !body) return false;
  const review = await Review.findById(input.reviewId).select('course').lean();
  if (!review) return false;
  const course = await Course.findById(review.course).select('instructor').lean();
  if (!course) return false;
  if (!input.isAdmin && String(course.instructor) !== input.instructorId) return false;
  const result = await Review.updateOne({ _id: input.reviewId }, { replyBody: body, repliedAt: new Date() });
  return result.matchedCount > 0;
}

/** Put one announcement in every non-refunded learner's inbox for a course. */
export async function announceToCourse(input: {
  courseId: string;
  instructorId: string;
  isAdmin: boolean;
  message: string;
}): Promise<number | null> {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(input.courseId)) return null;
  const message = input.message.trim().slice(0, 1000);
  if (!message) return null;
  const course = await Course.findById(input.courseId).select('title slug instructor status').lean();
  if (!course) return null;
  if (!input.isAdmin && String(course.instructor) !== input.instructorId) return null;
  if (!course.slug) return null;

  const learners = await Enrolment.find({ course: course._id, status: { $ne: 'refunded' } })
    .select('student')
    .limit(5000)
    .lean();
  if (learners.length === 0) return 0;

  await Notification.insertMany(
    learners.map((enrolment) => ({
      user: enrolment.student,
      kind: 'system',
      title: { bn: 'কোর্সের ঘোষণা', en: 'Course announcement' },
      body: { bn: message, en: message },
      href: `/learn/${course.slug}`,
      readAt: null,
    })),
  );
  return learners.length;
}

export type InstructorQuestionRow = {
  id: string;
  courseTitle: Localized;
  lessonTitle: Localized;
  author: string;
  body: string;
  answered: boolean;
  answers: Array<{ author: string; body: string; createdAt: string }>;
  createdAt: string;
};

export type InstructorQuestionDesk = {
  courses: Array<{ id: string; title: Localized; slug: string }>;
  questions: InstructorQuestionRow[];
  unanswered: number;
};

/** Lesson questions on the teacher's own courses, unanswered threads first. */
export async function getInstructorQuestions(instructorId: string, isAdmin = false): Promise<InstructorQuestionDesk> {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(instructorId)) return { courses: [], questions: [], unanswered: 0 };
  const courses = await Course.find(isAdmin ? {} : { instructor: instructorId })
    .select('title slug instructor')
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  const owned = isAdmin ? courses : courses.filter((course) => String(course.instructor) === instructorId);
  if (owned.length === 0) return { courses: [], questions: [], unanswered: 0 };

  const questions = await Question.find({ course: { $in: owned.map((course) => course._id) }, hidden: { $ne: true } })
    .sort({ createdAt: -1 })
    .limit(60)
    .lean();
  const [lessons, users] = await Promise.all([
    Lesson.find({ _id: { $in: questions.map((question) => question.lesson) } })
      .select('title')
      .lean(),
    User.find({
      _id: {
        $in: questions.flatMap((question) => [question.author, ...question.answers.map((answer) => answer.author)]),
      },
    })
      .select('name')
      .lean(),
  ]);
  const courseTitles = new Map(owned.map((course) => [String(course._id), course.title]));
  const lessonTitles = new Map(lessons.map((lesson) => [String(lesson._id), lesson.title]));
  const names = new Map(users.map((user) => [String(user._id), user.name]));

  const rows = questions.map((question) => ({
    id: String(question._id),
    courseTitle: courseTitles.get(String(question.course)) ?? {},
    lessonTitle: lessonTitles.get(String(question.lesson)) ?? {},
    author: names.get(String(question.author)) ?? 'Learner',
    body: question.body,
    answered: question.answers.length > 0,
    answers: question.answers.map((answer) => ({
      author: names.get(String(answer.author)) ?? 'Teacher',
      body: answer.body,
      createdAt: answer.createdAt.toISOString(),
    })),
    createdAt: question.createdAt.toISOString(),
  }));

  return {
    courses: owned.map((course) => ({ id: String(course._id), title: course.title, slug: course.slug })),
    questions: rows.sort((a, b) => Number(a.answered) - Number(b.answered)),
    unanswered: rows.filter((row) => !row.answered).length,
  };
}

/** Add the instructor's answer to a question on a course they own. */
export async function answerCourseQuestion(input: {
  questionId: string;
  instructorId: string;
  isAdmin: boolean;
  body: string;
}): Promise<boolean> {
  await connectToDatabase();
  const body = input.body.trim().slice(0, 2000);
  if (!Types.ObjectId.isValid(input.questionId) || body.length < 2) return false;
  const question = await Question.findById(input.questionId);
  if (!question) return false;
  const course = await Course.findById(question.course).select('instructor').lean();
  if (!course) return false;
  if (!input.isAdmin && String(course.instructor) !== input.instructorId) return false;
  question.answers.push({ author: new Types.ObjectId(input.instructorId), body, createdAt: new Date() } as never);
  await question.save();
  return true;
}

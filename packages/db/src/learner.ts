import type { Types } from 'mongoose';
import { connectToDatabase } from './connection';
import { Cart } from './models/cart';
import { Course } from './models/course';
import { Enrolment } from './models/enrolment';
import { LearningEvent } from './models/learning-event';
import { Lesson } from './models/lesson';
import { Note } from './models/note';
import { Bookmark } from './models/bookmark';
import { CommerceError, quoteCoupon } from './commerce';
import { payablePaisa } from './commerce';

export type CartCourse = {
  id: string;
  slug: string;
  title: { bn?: string; en?: string };
  pricePaisa: number;
  level: string;
  language: string;
};

export type CartView = {
  courses: CartCourse[];
  subtotalPaisa: number;
  discountPaisa: number;
  totalPaisa: number;
  couponCode: string | null;
  couponError: string | null;
};

const EMPTY_CART: CartView = {
  courses: [],
  subtotalPaisa: 0,
  discountPaisa: 0,
  totalPaisa: 0,
  couponCode: null,
  couponError: null,
};

/** Load the cart with live prices; a course that was unpublished or removed drops out. */
export async function getCartView(userId: string): Promise<CartView> {
  await connectToDatabase();
  const cart = await Cart.findOne({ user: userId }).lean();
  if (!cart || cart.courses.length === 0) return { ...EMPTY_CART };

  const documents = await Course.find({ _id: { $in: cart.courses }, status: 'published' }).lean();
  const ordered = cart.courses.flatMap((id) => {
    const match = documents.find((document) => String(document._id) === String(id));
    return match
      ? [
          {
            id: String(match._id),
            slug: match.slug,
            title: match.title,
            pricePaisa: payablePaisa(match),
            level: match.level,
            language: match.language,
          },
        ]
      : [];
  });
  const subtotalPaisa = ordered.reduce((total, course) => total + course.pricePaisa, 0);

  let discountPaisa = 0;
  let couponCode: string | null = cart.couponCode ?? null;
  let couponError: string | null = null;
  if (cart.couponCode && ordered.length > 0) {
    try {
      const quote = await quoteCoupon(cart.couponCode, subtotalPaisa, ordered[0]!.id);
      if (quote.coupon?.course && ordered.length > 1) {
        couponError = 'That coupon covers a single course.';
      } else {
        discountPaisa = quote.discountPaisa;
        couponCode = quote.coupon?.code ?? null;
      }
    } catch (error) {
      couponError = error instanceof CommerceError ? error.message : 'That coupon could not be applied.';
    }
  }

  return {
    courses: ordered,
    subtotalPaisa,
    discountPaisa,
    totalPaisa: subtotalPaisa - discountPaisa,
    couponCode,
    couponError,
  };
}

/** Add a paid, published course once. Free courses enrol directly instead. */
export async function addToCart(userId: string, courseId: string): Promise<'added' | 'free' | 'missing'> {
  await connectToDatabase();
  if (!/^[a-f0-9]{24}$/i.test(courseId)) return 'missing';
  const course = await Course.findOne({ _id: courseId, status: 'published' }).lean();
  if (!course) return 'missing';
  if (payablePaisa(course) <= 0) return 'free';
  await Cart.updateOne({ user: userId }, { $addToSet: { courses: course._id } }, { upsert: true });
  return 'added';
}

/** Remove one course and clear a coupon that no longer has anything to discount. */
export async function removeFromCart(userId: string, courseId: string): Promise<void> {
  await connectToDatabase();
  const cart = await Cart.findOne({ user: userId });
  if (!cart) return;
  cart.courses = cart.courses.filter((id) => String(id) !== courseId);
  if (cart.courses.length === 0) cart.set('couponCode', undefined);
  await cart.save();
}

/** Store a coupon code on the cart; validation happens when the cart is read. */
export async function setCartCoupon(userId: string, code: string): Promise<void> {
  await connectToDatabase();
  const clean = code.trim().toUpperCase().slice(0, 32);
  if (!clean) {
    await Cart.updateOne({ user: userId }, { $unset: { couponCode: 1 } }, { upsert: true });
    return;
  }
  await Cart.updateOne({ user: userId }, { couponCode: clean }, { upsert: true });
}

/** Empty the cart after a successful order. */
export async function clearCart(userId: string): Promise<void> {
  await connectToDatabase();
  await Cart.updateOne({ user: userId }, { $set: { courses: [], couponCode: null } }, { upsert: true });
}

/** A calendar day in UTC, the unit a streak counts. */
export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Count consecutive days with activity, ending today or yesterday. Yesterday is allowed
 * because a learner who studied last night should still see their streak this morning.
 */
export function streakFromDays(days: string[], today = new Date()): number {
  const unique = new Set(days);
  const cursor = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  if (!unique.has(dayKey(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  while (unique.has(dayKey(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export type Badge = {
  key: 'first_lesson' | 'first_course' | 'five_lessons' | 'twenty_lessons' | 'streak_3' | 'streak_7' | 'reviewer';
  earned: boolean;
  /** Progress towards the badge, 0-1, so the UI can show how close it is. */
  progress: number;
};

/** Badge rules are pure so the dashboard and the tests agree on what counts. */
export function earnedBadges(input: {
  lessonsCompleted: number;
  coursesCompleted: number;
  streak: number;
  reviewsWritten: number;
}): Badge[] {
  const rule = (earned: boolean, value: number, target: number): { earned: boolean; progress: number } => ({
    earned,
    progress: Math.max(0, Math.min(1, target === 0 ? 1 : value / target)),
  });
  return [
    { key: 'first_lesson', ...rule(input.lessonsCompleted >= 1, input.lessonsCompleted, 1) },
    { key: 'five_lessons', ...rule(input.lessonsCompleted >= 5, input.lessonsCompleted, 5) },
    { key: 'twenty_lessons', ...rule(input.lessonsCompleted >= 20, input.lessonsCompleted, 20) },
    { key: 'first_course', ...rule(input.coursesCompleted >= 1, input.coursesCompleted, 1) },
    { key: 'streak_3', ...rule(input.streak >= 3, input.streak, 3) },
    { key: 'streak_7', ...rule(input.streak >= 7, input.streak, 7) },
    { key: 'reviewer', ...rule(input.reviewsWritten >= 1, input.reviewsWritten, 1) },
  ];
}

export type LearnerHome = {
  streak: number;
  badges: Badge[];
  continueCourse: { slug: string; title: { bn?: string; en?: string }; lessonId: string | null } | null;
  notesCount: number;
  bookmarksCount: number;
};

/** Everything the learner home adds on top of the course list. */
export async function getLearnerHome(userId: string, reviewsWritten: number): Promise<LearnerHome> {
  await connectToDatabase();
  const [events, enrolments, notesCount, bookmarksCount] = await Promise.all([
    LearningEvent.find({ student: userId }).select('occurredAt').sort({ occurredAt: -1 }).limit(400).lean(),
    Enrolment.find({ student: userId }).sort({ updatedAt: -1 }).lean(),
    Note.countDocuments({ student: userId }),
    Bookmark.countDocuments({ student: userId }),
  ]);

  const streak = streakFromDays(events.map((event) => dayKey(event.occurredAt)));
  const lessonsCompleted = enrolments.reduce((total, enrolment) => total + enrolment.completedLessonIds.length, 0);
  const coursesCompleted = enrolments.filter((enrolment) => enrolment.status === 'completed').length;

  const active = enrolments.find((enrolment) => enrolment.status === 'active' && enrolment.completedLessonIds.length < 100000);
  let continueCourse: LearnerHome['continueCourse'] = null;
  if (active) {
    const course = await Course.findById(active.course).select('slug title').lean();
    if (course) {
      let lessonId = active.lastLessonId ? String(active.lastLessonId) : null;
      if (!lessonId) {
        const next = await Lesson.findOne({ course: course._id, _id: { $nin: active.completedLessonIds } })
          .sort({ order: 1 })
          .select('_id')
          .lean();
        lessonId = next ? String(next._id) : null;
      }
      continueCourse = { slug: course.slug, title: course.title, lessonId };
    }
  }

  return {
    streak,
    badges: earnedBadges({ lessonsCompleted, coursesCompleted, streak, reviewsWritten }),
    continueCourse,
    notesCount,
    bookmarksCount,
  };
}

/** Record a completed lesson once; the unique index makes a repeat harmless. */
export async function recordLessonEvent(
  studentId: string,
  courseId: string,
  lessonId: string,
  type: 'lesson_completed' | 'quiz_passed' = 'lesson_completed',
): Promise<void> {
  await connectToDatabase();
  try {
    await LearningEvent.updateOne(
      { student: studentId, lesson: lessonId, type: 'lesson_completed' },
      { $setOnInsert: { course: courseId, occurredAt: new Date() } },
      { upsert: true },
    );
    if (type === 'quiz_passed') {
      await LearningEvent.updateOne(
        { student: studentId, lesson: lessonId, type: 'quiz_passed' },
        { $setOnInsert: { course: courseId, occurredAt: new Date() } },
        { upsert: true },
      );
    }
  } catch {
    // A duplicate event is not a reason to fail the lesson write.
  }
}

/** Remember the lesson a reader last opened, for "continue learning". */
export async function rememberLastLesson(studentId: string, courseId: string, lessonId: string): Promise<void> {
  await connectToDatabase();
  await Enrolment.updateOne(
    { student: studentId, course: courseId },
    { lastLessonId: lessonId, lastSeenAt: new Date() },
  );
}

export type BookmarkView = {
  id: string;
  lessonId: string;
  courseSlug: string;
  courseTitle: { bn?: string; en?: string };
  lessonTitle: { bn?: string; en?: string };
  createdAt: string;
};

/** Lesson bookmarks with the course and lesson titles resolved for the notes page. */
export async function listBookmarks(studentId: string): Promise<BookmarkView[]> {
  await connectToDatabase();
  const bookmarks = await Bookmark.find({ student: studentId }).sort({ createdAt: -1 }).limit(100).lean();
  if (bookmarks.length === 0) return [];
  const courseIds = [...new Set(bookmarks.map((bookmark) => bookmark.course))];
  const lessonIds = bookmarks.map((bookmark) => bookmark.lesson);
  const [courses, lessons] = await Promise.all([
    Course.find({ _id: { $in: courseIds } }).select('slug title').lean(),
    Lesson.find({ _id: { $in: lessonIds } }).select('title').lean(),
  ]);
  const courseMap = new Map(courses.map((course) => [String(course._id), course]));
  const lessonMap = new Map(lessons.map((lesson) => [String(lesson._id), lesson]));
  return bookmarks.flatMap((bookmark) => {
    const course = courseMap.get(String(bookmark.course));
    const lesson = lessonMap.get(String(bookmark.lesson));
    if (!course || !lesson) return [];
    return [
      {
        id: String(bookmark._id),
        lessonId: String(bookmark.lesson),
        courseSlug: course.slug,
        courseTitle: course.title,
        lessonTitle: lesson.title,
        createdAt: bookmark.createdAt.toISOString(),
      },
    ];
  });
}

export type NoteView = {
  id: string;
  body: string;
  updatedAt: string;
  courseSlug: string;
  courseTitle: { bn?: string; en?: string };
  lessonId: string;
  lessonTitle: { bn?: string; en?: string };
};

/** All notes with their lesson context, for the notes page. */
export async function listNotes(studentId: string): Promise<NoteView[]> {
  await connectToDatabase();
  const notes = await Note.find({ student: studentId }).sort({ updatedAt: -1 }).limit(100).lean();
  if (notes.length === 0) return [];
  const courseIds = [...new Set(notes.map((note) => note.course))];
  const lessonIds = notes.map((note) => note.lesson);
  const [courses, lessons] = await Promise.all([
    Course.find({ _id: { $in: courseIds } }).select('slug title').lean(),
    Lesson.find({ _id: { $in: lessonIds } }).select('title').lean(),
  ]);
  const courseMap = new Map(courses.map((course) => [String(course._id), course]));
  const lessonMap = new Map(lessons.map((lesson) => [String(lesson._id), lesson]));
  return notes.flatMap((note) => {
    const course = courseMap.get(String(note.course));
    const lesson = lessonMap.get(String(note.lesson));
    if (!course || !lesson) return [];
    return [
      {
        id: String(note._id),
        body: note.body,
        updatedAt: note.updatedAt.toISOString(),
        courseSlug: course.slug,
        courseTitle: course.title,
        lessonId: String(note.lesson),
        lessonTitle: lesson.title,
      },
    ];
  });
}

export type { Types };

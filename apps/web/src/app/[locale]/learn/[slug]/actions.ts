'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  Bookmark,
  Course,
  Enrolment,
  Lesson,
  Note,
  recordLessonEvent,
  issueCertificateIfEligible,
  ensureRemindersForEnrolment,
  Question,
  QuizAttempt,
  QuizQuestion,
  Review,
  Wishlist,
  connectToDatabase,
  scoreQuiz,
} from '@pathshala/db';
import { calculateProgress } from '@pathshala/shared';
import { requireUser } from '@/lib/auth/guard';
import { canAccessCourse } from '@/lib/learning';

const OBJECT_ID = /^[a-f0-9]{24}$/i;

function text(form: FormData, key: string): string {
  return String(form.get(key) ?? '');
}

function path(form: FormData, suffix: string): string {
  return `${form.get('locale') === 'en' ? '/en' : ''}${suffix}`;
}

function fail(form: FormData, suffix: string, message: string): never {
  redirect(`${path(form, suffix)}?error=${encodeURIComponent(message)}`);
}

/** Enrol a signed-in reader in a free course; paid courses go through checkout in P4. */
export async function enrolAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const courseId = text(form, 'courseId');
  const slug = text(form, 'slug');
  if (!OBJECT_ID.test(courseId)) fail(form, `/courses/${slug}`, 'Course not found.');

  await connectToDatabase();
  const course = await Course.findOne({ _id: courseId, status: 'published' });
  if (!course) fail(form, `/courses/${slug}`, 'Course not found.');
  if (course.pricePaisa > 0) fail(form, `/courses/${slug}`, 'Checkout will open with the payment phase.');

  await Enrolment.findOneAndUpdate(
    { student: user.id, course: course._id },
    { $setOnInsert: { enrolledAt: new Date() } },
    { upsert: true, returnDocument: 'after' },
  );
  await ensureRemindersForEnrolment(user.id, String(course._id));
  revalidatePath(`/courses/${slug}`);
  revalidatePath('/dashboard');
  redirect(path(form, `/learn/${slug}`));
}

/** Add or remove a course from the reader's saved list. */
export async function toggleWishlistAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const courseId = text(form, 'courseId');
  const slug = text(form, 'slug');
  if (!OBJECT_ID.test(courseId)) fail(form, `/courses/${slug}`, 'Course not found.');
  await connectToDatabase();
  const existing = await Wishlist.findOne({ student: user.id, course: courseId });
  if (existing) await existing.deleteOne();
  else await Wishlist.create({ student: user.id, course: courseId });
  revalidatePath(`/courses/${slug}`);
  revalidatePath('/dashboard');
  redirect(path(form, `/courses/${slug}`));
}

/** Recompute percentage and completion from the authoritative lesson set. */
async function syncProgress(studentId: string, courseId: string, lessonId: string, complete: boolean) {
  const [course, totalLessons] = await Promise.all([
    Course.findById(courseId).select('_id').lean(),
    Lesson.countDocuments({ course: courseId }),
  ]);
  if (!course) return;
  const enrolment = await Enrolment.findOne({ student: studentId, course: courseId });
  if (!enrolment) return;

  const completed = new Set(enrolment.completedLessonIds.map(String));
  if (complete) completed.add(lessonId);
  else completed.delete(lessonId);
  const finished = totalLessons > 0 && completed.size >= totalLessons;
  enrolment.set('completedLessonIds', [...completed]);
  enrolment.progressPercent = calculateProgress(completed.size, totalLessons);
  enrolment.status = finished ? 'completed' : 'active';
  enrolment.completedAt = finished ? (enrolment.completedAt ?? new Date()) : null;
  await enrolment.save();
  if (finished) await issueCertificateIfEligible(studentId, courseId);
}

/** Mark one lesson complete for an enrolled reader. */
export async function markLessonAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const courseId = text(form, 'courseId');
  const lessonId = text(form, 'lessonId');
  const slug = text(form, 'slug');
  if (!OBJECT_ID.test(courseId) || !OBJECT_ID.test(lessonId)) fail(form, `/learn/${slug}`, 'Lesson not found.');
  if (!(await canAccessCourse(courseId, user.id, user.roles))) fail(form, `/courses/${slug}`, 'Enrol to open this course.');

  await connectToDatabase();
  const lesson = await Lesson.findOne({ _id: lessonId, course: courseId }).select('_id').lean();
  if (!lesson) fail(form, `/learn/${slug}`, 'Lesson not found.');
  await syncProgress(user.id, courseId, lessonId, true);
  await recordLessonEvent(user.id, courseId, lessonId);
  revalidatePath(`/learn/${slug}`);
  revalidatePath('/dashboard');
  redirect(path(form, `/learn/${slug}?lesson=${lessonId}`));
}

/** Add or remove a lesson bookmark for an enrolled reader. */
export async function toggleBookmarkAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const courseId = text(form, 'courseId');
  const lessonId = text(form, 'lessonId');
  const slug = text(form, 'slug');
  if (!OBJECT_ID.test(courseId) || !OBJECT_ID.test(lessonId)) fail(form, `/learn/${slug}`, 'Lesson not found.');
  if (!(await canAccessCourse(courseId, user.id, user.roles))) fail(form, `/courses/${slug}`, 'Enrol to bookmark lessons.');
  await connectToDatabase();
  const existing = await Bookmark.findOne({ student: user.id, lesson: lessonId });
  if (existing) await existing.deleteOne();
  else await Bookmark.create({ student: user.id, course: courseId, lesson: lessonId });
  revalidatePath(`/learn/${slug}`);
  redirect(path(form, `/learn/${slug}?lesson=${lessonId}`));
}

/** Save the reader's private note for one lesson. */
export async function saveNoteAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const courseId = text(form, 'courseId');
  const lessonId = text(form, 'lessonId');
  const slug = text(form, 'slug');
  if (!(await canAccessCourse(courseId, user.id, user.roles))) fail(form, `/courses/${slug}`, 'Enrol to open this course.');
  await connectToDatabase();
  const body = text(form, 'body').slice(0, 4000);
  await Note.findOneAndUpdate(
    { student: user.id, lesson: lessonId },
    { course: courseId, body },
    { upsert: true, returnDocument: 'after' },
  );
  redirect(path(form, `/learn/${slug}?lesson=${lessonId}`));
}

/** Ask a question in the lesson thread. */
export async function askQuestionAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const courseId = text(form, 'courseId');
  const lessonId = text(form, 'lessonId');
  const slug = text(form, 'slug');
  const body = text(form, 'body').trim();
  if (body.length < 2) fail(form, `/learn/${slug}?lesson=${lessonId}`, 'Write a question first.');
  if (!(await canAccessCourse(courseId, user.id, user.roles))) fail(form, `/courses/${slug}`, 'Enrol to join the discussion.');
  await connectToDatabase();
  await Question.create({ course: courseId, lesson: lessonId, author: user.id, body: body.slice(0, 2000) });
  redirect(path(form, `/learn/${slug}?lesson=${lessonId}#questions`));
}

/** Add a reply to a lesson question. */
export async function answerQuestionAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const questionId = text(form, 'questionId');
  const lessonId = text(form, 'lessonId');
  const slug = text(form, 'slug');
  const body = text(form, 'body').trim();
  if (!OBJECT_ID.test(questionId) || body.length < 2) fail(form, `/learn/${slug}?lesson=${lessonId}`, 'Write a reply first.');
  await connectToDatabase();
  const question = await Question.findById(questionId);
  if (!question) fail(form, `/learn/${slug}?lesson=${lessonId}`, 'Question not found.');
  if (!(await canAccessCourse(String(question.course), user.id, user.roles))) {
    fail(form, `/courses/${slug}`, 'Enrol to join the discussion.');
  }
  question.answers.push({ author: user.id, body: body.slice(0, 2000), createdAt: new Date() } as never);
  await question.save();
  redirect(path(form, `/learn/${slug}?lesson=${lessonId}#questions`));
}

/** Score a quiz attempt server-side and complete the lesson on a pass. */
export async function submitQuizAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const courseId = text(form, 'courseId');
  const lessonId = text(form, 'lessonId');
  const slug = text(form, 'slug');
  if (!(await canAccessCourse(courseId, user.id, user.roles))) fail(form, `/courses/${slug}`, 'Enrol to take the quiz.');
  await connectToDatabase();
  const questions = await QuizQuestion.find({ lesson: lessonId }).sort({ order: 1 }).lean();
  if (questions.length === 0) fail(form, `/learn/${slug}?lesson=${lessonId}`, 'This quiz has no questions yet.');
  const answers = questions.map((question) => form.getAll(`q_${String(question._id)}`).map((value) => Number(value)).filter(Number.isInteger));
  const result = scoreQuiz(questions, answers);
  if (result.passed) await recordLessonEvent(user.id, courseId, lessonId, 'quiz_passed');
  await QuizAttempt.create({
    course: courseId,
    lesson: lessonId,
    student: user.id,
    answers,
    ...result,
  });
  if (result.passed) await syncProgress(user.id, courseId, lessonId, true);
  revalidatePath(`/learn/${slug}`);
  revalidatePath('/dashboard');
  redirect(path(form, `/learn/${slug}?lesson=${lessonId}&quiz=${result.passed ? 'passed' : 'failed'}`));
}

/** Enrolled readers can leave one review; averages are recomputed from reviews. */
export async function submitReviewAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const courseId = text(form, 'courseId');
  const slug = text(form, 'slug');
  const rating = Number(text(form, 'rating'));
  const body = text(form, 'body').trim().slice(0, 1200);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) fail(form, `/courses/${slug}`, 'Choose 1 to 5 stars.');

  await connectToDatabase();
  const enrolment = await Enrolment.exists({ student: user.id, course: courseId, status: { $ne: 'refunded' } });
  if (!enrolment) fail(form, `/courses/${slug}`, 'Finish or start the course before reviewing it.');
  await Review.findOneAndUpdate(
    { student: user.id, course: courseId },
    { rating, body },
    { upsert: true, returnDocument: 'after' },
  );
  // Aggregation cannot cast a string course id for $match, so average in memory;
  // a course has at most a few thousand reviews.
  const ratings = await Review.find({ course: courseId }).select('rating').lean();
  const count = ratings.length;
  const average = count > 0 ? ratings.reduce((total, review) => total + review.rating, 0) / count : 0;
  await Course.findByIdAndUpdate(courseId, {
    ratingAverage: Math.round(average * 10) / 10,
    ratingCount: count,
  });
  revalidatePath(`/courses/${slug}`);
  redirect(path(form, `/courses/${slug}#reviews`));
}

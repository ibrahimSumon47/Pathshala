'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  Category,
  Course,
  Lesson,
  QuizQuestion,
  Section,
  addBankItemToQuiz,
  connectToDatabase,
  createLiveSession,
  moveLesson,
  notifyWishlistPriceDrop,
  releaseAttendance,
  saveQuestionToBank,
  scheduleSessionReminders,
  updateLiveSessionCapacity,
  type QuizType,
} from '@pathshala/db';
import { toPaisa } from '@pathshala/shared';
import { z } from 'zod';
import { validateAttachment } from '@/lib/attachments';
import { requireRole } from '@/lib/auth/guard';
import { MAX_OUTCOMES, MIN_OUTCOMES, mergeFaqs, mergeLocalized } from '@/lib/course-content';
import { sanitizeLessonHtml } from '@/lib/sanitize';

const OBJECT_ID = /^[a-f0-9]{24}$/i;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const courseSchema = z.object({
  titleBn: z.string().trim().max(200).default(''),
  titleEn: z.string().trim().max(200).default(''),
  subtitleBn: z.string().trim().max(200).default(''),
  subtitleEn: z.string().trim().max(200).default(''),
  shortDescriptionBn: z.string().trim().max(300).default(''),
  shortDescriptionEn: z.string().trim().max(300).default(''),
  descriptionBn: z.string().trim().max(8000).default(''),
  descriptionEn: z.string().trim().max(8000).default(''),
  outcomesBn: z.string().max(4000).default(''),
  outcomesEn: z.string().max(4000).default(''),
  requirementsBn: z.string().max(4000).default(''),
  requirementsEn: z.string().max(4000).default(''),
  audienceBn: z.string().max(4000).default(''),
  audienceEn: z.string().max(4000).default(''),
  faqBn: z.string().max(12000).default(''),
  faqEn: z.string().max(12000).default(''),
  slug: z.string().trim().max(90).default(''),
  categoryId: z.string().trim(),
  priceTaka: z.coerce.number().min(0).max(100000),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  language: z.enum(['bn', 'en']),
});

const lessonSchema = z.object({
  courseId: z.string().trim(),
  sectionId: z.string().trim(),
  titleBn: z.string().trim().max(200).default(''),
  titleEn: z.string().trim().max(200).default(''),
  type: z.enum(['reading', 'video', 'quiz']),
  bodyHtml: z.string().max(20000).default(''),
  videoUrl: z.string().trim().max(500).default(''),
  attachmentName: z.string().trim().max(160).default(''),
  attachmentUrl: z.string().trim().max(500).default(''),
  attachmentMime: z.string().trim().default(''),
  attachmentSize: z.coerce.number().int().min(1).max(20 * 1024 * 1024).default(1),
  durationMinutes: z.coerce.number().int().min(0).max(600).default(0),
});

function text(form: FormData, key: string): string {
  return String(form.get(key) ?? '');
}

/** Collect every course detail field so create and update read the same shape. */
function courseFields(form: FormData) {
  return {
    titleBn: text(form, 'titleBn'),
    titleEn: text(form, 'titleEn'),
    subtitleBn: text(form, 'subtitleBn'),
    subtitleEn: text(form, 'subtitleEn'),
    shortDescriptionBn: text(form, 'shortDescriptionBn'),
    shortDescriptionEn: text(form, 'shortDescriptionEn'),
    descriptionBn: text(form, 'descriptionBn'),
    descriptionEn: text(form, 'descriptionEn'),
    outcomesBn: text(form, 'outcomesBn'),
    outcomesEn: text(form, 'outcomesEn'),
    requirementsBn: text(form, 'requirementsBn'),
    requirementsEn: text(form, 'requirementsEn'),
    audienceBn: text(form, 'audienceBn'),
    audienceEn: text(form, 'audienceEn'),
    faqBn: text(form, 'faqBn'),
    faqEn: text(form, 'faqEn'),
    slug: text(form, 'slug'),
    categoryId: text(form, 'categoryId'),
    priceTaka: text(form, 'priceTaka') || '0',
    level: text(form, 'level'),
    language: text(form, 'language'),
  };
}

function localePath(form: FormData, path: string): string {
  return `${form.get('locale') === 'en' ? '/en' : ''}${path}`;
}

/** Send the instructor back to the form with one readable message. */
function fail(form: FormData, path: string, message: string): never {
  redirect(`${localePath(form, path)}?error=${encodeURIComponent(message)}`);
}

/** Create a lowercase hyphen slug when the instructor leaves it blank. */
function makeSlug(input: string, title: string): string {
  const base = input || title || `course-${Date.now()}`;
  return base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Only the owning instructor or an admin may change a course. */
async function ownedCourse(courseId: string, userId: string, isAdmin: boolean) {
  if (!OBJECT_ID.test(courseId)) return null;
  await connectToDatabase();
  const course = await Course.findById(courseId);
  if (!course) return null;
  if (!isAdmin && String(course.instructor) !== userId) return null;
  if (!isAdmin && !course.instructor) return null;
  return course;
}

/** Create a draft course owned by the signed-in instructor. */
export async function createCourseAction(form: FormData): Promise<void> {
  const user = await requireRole('instructor', 'admin');
  const parsed = courseSchema.safeParse(courseFields(form));
  if (!parsed.success) fail(form, '/studio', 'Check the course details and try again.');
  if (!parsed.data.titleBn && !parsed.data.titleEn) fail(form, '/studio', 'Add a title in Bangla or English.');
  if (!OBJECT_ID.test(parsed.data.categoryId)) fail(form, '/studio', 'Choose a category.');
  if (!SLUG.test(makeSlug(parsed.data.slug, parsed.data.titleEn))) fail(form, '/studio', 'Use a valid slug.');

  await connectToDatabase();
  const category = await Category.findById(parsed.data.categoryId).lean();
  if (!category) fail(form, '/studio', 'That category no longer exists.');

  try {
    const course = await Course.create({
      title: { bn: parsed.data.titleBn, en: parsed.data.titleEn },
      subtitle: { bn: parsed.data.subtitleBn, en: parsed.data.subtitleEn },
      shortDescription: { bn: parsed.data.shortDescriptionBn, en: parsed.data.shortDescriptionEn },
      description: { bn: parsed.data.descriptionBn, en: parsed.data.descriptionEn },
      slug: makeSlug(parsed.data.slug, parsed.data.titleEn),
      category: parsed.data.categoryId,
      instructor: user.id,
      language: parsed.data.language,
      level: parsed.data.level,
      pricePaisa: toPaisa(parsed.data.priceTaka),
      status: 'draft',
      outcomes: mergeLocalized(parsed.data.outcomesBn, parsed.data.outcomesEn, MAX_OUTCOMES),
      requirements: mergeLocalized(parsed.data.requirementsBn, parsed.data.requirementsEn),
      audience: mergeLocalized(parsed.data.audienceBn, parsed.data.audienceEn),
      faqs: mergeFaqs(parsed.data.faqBn, parsed.data.faqEn),
    });
    revalidatePath('/studio');
    redirect(localePath(form, `/studio/${course._id}`));
  } catch (error) {
    if (error instanceof Error && error.message.includes('duplicate key')) {
      fail(form, '/studio', 'That slug is already in use.');
    }
    throw error;
  }
}

/** Save course details; publishing requires at least one lesson. */
export async function updateCourseAction(form: FormData): Promise<void> {
  const user = await requireRole('instructor', 'admin');
  const courseId = text(form, 'courseId');
  const course = await ownedCourse(courseId, user.id, user.roles.includes('admin'));
  if (!course) fail(form, '/studio', 'Course not found.');

  const parsed = courseSchema.safeParse(courseFields(form));
  if (!parsed.success) fail(form, `/studio/${courseId}`, 'Check the course details and try again.');
  if (!parsed.data.titleBn && !parsed.data.titleEn) fail(form, `/studio/${courseId}`, 'Add a title.');

  const outcomes = mergeLocalized(parsed.data.outcomesBn, parsed.data.outcomesEn, MAX_OUTCOMES);
  const publish = form.get('publish') === 'on';
  if (publish) {
    const lessons = await Lesson.countDocuments({ course: course._id });
    if (lessons === 0) fail(form, `/studio/${courseId}`, 'Add at least one lesson before publishing.');
    // A public page promises six to eight outcomes; refuse to publish a thinner one.
    if (outcomes.length < MIN_OUTCOMES) {
      fail(form, `/studio/${courseId}`, `Add at least ${MIN_OUTCOMES} learning outcomes before publishing.`);
    }
  }

  const previousPricePaisa = course.pricePaisa;
  course.set({
    title: { bn: parsed.data.titleBn, en: parsed.data.titleEn },
    subtitle: { bn: parsed.data.subtitleBn, en: parsed.data.subtitleEn },
    shortDescription: { bn: parsed.data.shortDescriptionBn, en: parsed.data.shortDescriptionEn },
    description: { bn: parsed.data.descriptionBn, en: parsed.data.descriptionEn },
    slug: makeSlug(parsed.data.slug, parsed.data.titleEn),
    category: parsed.data.categoryId,
    language: parsed.data.language,
    level: parsed.data.level,
    pricePaisa: toPaisa(parsed.data.priceTaka),
    outcomes,
    requirements: mergeLocalized(parsed.data.requirementsBn, parsed.data.requirementsEn),
    audience: mergeLocalized(parsed.data.audienceBn, parsed.data.audienceEn),
    faqs: mergeFaqs(parsed.data.faqBn, parsed.data.faqEn),
    status: publish ? 'published' : course.status === 'published' ? 'published' : 'draft',
    publishedAt: publish ? (course.publishedAt ?? new Date()) : course.publishedAt,
  });
  await course.save();
  // A real price cut is worth telling the learners who saved the course; a raise is not.
  await notifyWishlistPriceDrop({
    courseId,
    oldPricePaisa: previousPricePaisa,
    newPricePaisa: course.pricePaisa,
  }).catch(() => undefined);
  revalidatePath('/studio');
  revalidatePath(`/studio/${courseId}`);
  revalidatePath('/courses');
  redirect(localePath(form, `/studio/${courseId}?saved=1`));
}

/** Add the next section at the end of the course. */
export async function addSectionAction(form: FormData): Promise<void> {
  const user = await requireRole('instructor', 'admin');
  const courseId = text(form, 'courseId');
  const course = await ownedCourse(courseId, user.id, user.roles.includes('admin'));
  if (!course) fail(form, '/studio', 'Course not found.');
  const titleBn = text(form, 'titleBn').trim();
  const titleEn = text(form, 'titleEn').trim();
  if (!titleBn && !titleEn) fail(form, `/studio/${courseId}`, 'Add a section title.');

  await connectToDatabase();
  const last = await Section.findOne({ course: course._id }).sort({ order: -1 }).select('order').lean();
  await Section.create({ course: course._id, title: { bn: titleBn, en: titleEn }, order: (last?.order ?? 0) + 1 });
  revalidatePath(`/studio/${courseId}`);
  redirect(localePath(form, `/studio/${courseId}?saved=1`));
}

/** Schedule one live room and create an in-app reminder for every enrolled student. */
export async function scheduleSessionAction(form: FormData): Promise<void> {
  const user = await requireRole('instructor', 'admin');
  const courseId = text(form, 'courseId');
  const course = await ownedCourse(courseId, user.id, user.roles.includes('admin'));
  if (!course) fail(form, '/studio', 'Course not found.');

  const titleBn = text(form, 'titleBn').trim();
  const titleEn = text(form, 'titleEn').trim();
  const startsAtRaw = text(form, 'startsAt');
  const startsAt = new Date(startsAtRaw);
  const duration = Number.parseInt(text(form, 'durationMinutes') || '60', 10);
  const capacity = Number.parseInt(text(form, 'capacity') || '0', 10);
  if (!titleBn && !titleEn) fail(form, `/studio/${courseId}`, 'Give the class a title.');
  if (!startsAtRaw || Number.isNaN(startsAt.getTime())) fail(form, `/studio/${courseId}`, 'Choose a valid date and time.');
  if (startsAt.getTime() <= Date.now()) fail(form, `/studio/${courseId}`, 'The class must start in the future.');
  if (!Number.isInteger(duration) || duration < 15 || duration > 240) fail(form, `/studio/${courseId}`, 'Duration is 15-240 minutes.');
  if (!Number.isInteger(capacity) || capacity < 0 || capacity > 1000) {
    fail(form, `/studio/${courseId}`, 'Capacity is 0-1000; 0 means no cap.');
  }

  const session = await createLiveSession({
    courseId: course.id,
    instructorId: user.id,
    title: { bn: titleBn.slice(0, 160), en: titleEn.slice(0, 160) },
    description: { bn: text(form, 'descriptionBn').trim().slice(0, 800), en: text(form, 'descriptionEn').trim().slice(0, 800) },
    startsAt,
    durationMinutes: duration,
    capacity,
  });
  await scheduleSessionReminders(session.id);
  revalidatePath(`/studio/${courseId}`);
  revalidatePath(`/live/${course.slug}`);
  redirect(localePath(form, `/studio/${courseId}?saved=1`));
}

/** Change a scheduled room's seat cap; a raise notifies the front of the waitlist. */
export async function updateLiveCapacityAction(form: FormData): Promise<void> {
  const user = await requireRole('instructor', 'admin');
  const courseId = text(form, 'courseId');
  const course = await ownedCourse(courseId, user.id, user.roles.includes('admin'));
  if (!course) fail(form, '/studio', 'Course not found.');
  const capacity = Number.parseInt(text(form, 'capacity') || '0', 10);
  if (!Number.isInteger(capacity) || capacity < 0 || capacity > 1000) {
    fail(form, `/studio/${courseId}`, 'Capacity is 0-1000; 0 means no cap.');
  }
  const result = await updateLiveSessionCapacity({ sessionId: text(form, 'sessionId'), courseId: course.id, capacity });
  if (!result) fail(form, `/studio/${courseId}`, 'That live class could not be changed.');
  revalidatePath(`/studio/${courseId}`);
  revalidatePath(`/live/${course.slug}`);
  redirect(localePath(form, `/studio/${courseId}?saved=1`));
}

/** Remove one checked-in learner and tell the next person in the queue. */
export async function releaseSeatAction(form: FormData): Promise<void> {
  const user = await requireRole('instructor', 'admin');
  const courseId = text(form, 'courseId');
  const course = await ownedCourse(courseId, user.id, user.roles.includes('admin'));
  if (!course) fail(form, '/studio', 'Course not found.');
  const result = await releaseAttendance({
    sessionId: text(form, 'sessionId'),
    courseId: course.id,
    studentId: text(form, 'studentId'),
    actorId: user.id,
  });
  if (!result.released) fail(form, `/studio/${courseId}`, 'That seat could not be released.');
  revalidatePath(`/studio/${courseId}`);
  revalidatePath(`/live/${course.slug}`);
  redirect(localePath(form, `/studio/${courseId}?saved=1`));
}

/** Add one scored question to a quiz lesson. */
export async function addQuizQuestionAction(form: FormData): Promise<void> {
  const user = await requireRole('instructor', 'admin');
  const courseId = text(form, 'courseId');
  const lessonId = text(form, 'lessonId');
  const course = await ownedCourse(courseId, user.id, user.roles.includes('admin'));
  if (!course) fail(form, '/studio', 'Course not found.');
  if (!OBJECT_ID.test(lessonId)) fail(form, `/studio/${courseId}`, 'Lesson not found.');

  await connectToDatabase();
  const lesson = await Lesson.findOne({ _id: lessonId, course: course._id }).lean();
  if (!lesson || lesson.type !== 'quiz') fail(form, `/studio/${courseId}`, 'Choose a quiz lesson first.');

  const prompt = text(form, 'prompt').trim();
  const rawType = text(form, 'type');
  if (!['single', 'multiple', 'true-false'].includes(rawType)) fail(form, `/studio/${courseId}`, 'Choose a question type.');
  const type = rawType as QuizType;
  const options = [0, 1, 2, 3].map((index) => text(form, `option${index}`).trim()).filter(Boolean);
  const correct = text(form, 'correct')
    .split(',')
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isInteger(value));
  const points = Number.parseInt(text(form, 'points') || '1', 10);
  const explanation = text(form, 'explanation').trim().slice(0, 500);
  if (prompt.length < 4) fail(form, `/studio/${courseId}`, 'Write a question.');
  if (options.length < 2) fail(form, `/studio/${courseId}`, 'Add at least two options.');
  if (correct.length < 1 || correct.some((index) => index < 0 || index >= options.length)) {
    fail(form, `/studio/${courseId}`, 'Mark at least one valid answer.');
  }
  if (type === 'single' && correct.length !== 1) fail(form, `/studio/${courseId}`, 'Single choice needs one answer.');
  if (type === 'true-false' && options.length !== 2) fail(form, `/studio/${courseId}`, 'True/false needs exactly two options.');

  const last = await QuizQuestion.findOne({ lesson: lesson._id }).sort({ order: -1 }).select('order').lean();
  await QuizQuestion.create({
    course: course._id,
    lesson: lesson._id,
    prompt: prompt.slice(0, 500),
    type,
    options,
    correctIndexes: [...new Set(correct)].sort((a, b) => a - b),
    explanation,
    points: Number.isInteger(points) ? Math.max(1, Math.min(10, points)) : 1,
    order: (last?.order ?? 0) + 1,
  });
  revalidatePath(`/studio/${courseId}/lesson/${lessonId}`);
  redirect(localePath(form, `/studio/${courseId}/lesson/${lessonId}?saved=1`));
}

/** Move one lesson up or down inside its section, normalising sibling positions. */
export async function moveLessonAction(form: FormData): Promise<void> {
  const user = await requireRole('instructor', 'admin');
  const courseId = text(form, 'courseId');
  const direction = text(form, 'direction') === 'up' ? 'up' : 'down';
  const result = await moveLesson({
    courseId,
    lessonId: text(form, 'lessonId'),
    instructorId: user.id,
    isAdmin: user.roles.includes('admin'),
    direction,
  });
  if (result === 'not_found') fail(form, `/studio/${courseId}`, 'Lesson not found.');
  if (result === 'edge') fail(form, `/studio/${courseId}`, 'That lesson is already at the end.');
  revalidatePath(`/studio/${courseId}`);
  revalidatePath('/courses');
  revalidatePath('/learn');
  redirect(localePath(form, `/studio/${courseId}?saved=1`));
}

/** Copy one authored question into the teacher's reusable bank. */
export async function saveQuestionToBankAction(form: FormData): Promise<void> {
  const user = await requireRole('instructor', 'admin');
  const courseId = text(form, 'courseId');
  const lessonId = text(form, 'lessonId');
  const result = await saveQuestionToBank({
    instructorId: user.id,
    questionId: text(form, 'questionId'),
    isAdmin: user.roles.includes('admin'),
  });
  const base = `/studio/${courseId}/lesson/${lessonId}`;
  if (result === 'not_found') fail(form, base, 'Question not found.');
  revalidatePath(base);
  redirect(localePath(form, `${base}?bank=${result}`));
}

/** Append one saved bank question to the quiz lesson being edited. */
export async function addBankQuestionAction(form: FormData): Promise<void> {
  const user = await requireRole('instructor', 'admin');
  const courseId = text(form, 'courseId');
  const lessonId = text(form, 'lessonId');
  const result = await addBankItemToQuiz({
    bankItemId: text(form, 'bankItemId'),
    lessonId,
    instructorId: user.id,
    isAdmin: user.roles.includes('admin'),
  });
  const base = `/studio/${courseId}/lesson/${lessonId}`;
  if (result === 'not_found') fail(form, base, 'That saved question cannot be added here.');
  revalidatePath(base);
  redirect(localePath(form, `${base}?bank=${result === 'duplicate' ? 'duplicate' : 'added'}`));
}

/** Add a lesson, with a validated attachment and a video slot when supplied. */
export async function addLessonAction(form: FormData): Promise<void> {
  const user = await requireRole('instructor', 'admin');
  const courseId = text(form, 'courseId');
  const course = await ownedCourse(courseId, user.id, user.roles.includes('admin'));
  if (!course) fail(form, '/studio', 'Course not found.');

  const parsed = lessonSchema.safeParse({
    courseId,
    sectionId: text(form, 'sectionId'),
    titleBn: text(form, 'titleBn'),
    titleEn: text(form, 'titleEn'),
    type: text(form, 'type'),
    bodyHtml: text(form, 'bodyHtml'),
    videoUrl: text(form, 'videoUrl'),
    attachmentName: text(form, 'attachmentName'),
    attachmentUrl: text(form, 'attachmentUrl'),
    attachmentMime: text(form, 'attachmentMime'),
    attachmentSize: text(form, 'attachmentSize') || '1',
    durationMinutes: text(form, 'durationMinutes') || '0',
  });
  if (!parsed.success) fail(form, `/studio/${courseId}`, 'Check the lesson details.');
  if (!parsed.data.titleBn && !parsed.data.titleEn) fail(form, `/studio/${courseId}`, 'Add a lesson title.');
  if (!OBJECT_ID.test(parsed.data.sectionId)) fail(form, `/studio/${courseId}`, 'Choose a section.');

  await connectToDatabase();
  const section = await Section.findOne({ _id: parsed.data.sectionId, course: course._id }).lean();
  if (!section) fail(form, `/studio/${courseId}`, 'That section does not belong to this course.');

  const attachments = [];
  if (parsed.data.attachmentUrl) {
    const attachment = validateAttachment({
      name: parsed.data.attachmentName,
      url: parsed.data.attachmentUrl,
      mimeType: parsed.data.attachmentMime,
      sizeBytes: parsed.data.attachmentSize,
    });
    if (!attachment.ok) fail(form, `/studio/${courseId}`, attachment.error);
    attachments.push(attachment.value);
  }
  if (parsed.data.type === 'video' && parsed.data.videoUrl && !parsed.data.videoUrl.startsWith('https://')) {
    fail(form, `/studio/${courseId}`, 'Video links need https.');
  }

  const last = await Lesson.findOne({ course: course._id, section: section._id }).sort({ order: -1 }).select('order').lean();
  await Lesson.create({
    course: course._id,
    section: section._id,
    title: { bn: parsed.data.titleBn, en: parsed.data.titleEn },
    order: (last?.order ?? 0) + 1,
    type: parsed.data.type,
    content: { bodyHtml: sanitizeLessonHtml(parsed.data.bodyHtml), attachments },
    video: parsed.data.type === 'video' && parsed.data.videoUrl ? { url: parsed.data.videoUrl } : null,
    durationMinutes: parsed.data.durationMinutes,
  });
  revalidatePath(`/studio/${courseId}`);
  redirect(localePath(form, `/studio/${courseId}?saved=1`));
}

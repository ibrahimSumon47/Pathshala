import type { Types } from 'mongoose';
import type { Locale } from '@pathshala/shared';
import { Category, type CategoryDoc } from './models/category';
import { Course, type CourseDoc, type CourseLevel } from './models/course';
import { Lesson, type LessonDoc } from './models/lesson';
import { Review } from './models/review';
import { Section, type SectionDoc } from './models/section';
import { User } from './models/user';
import { connectToDatabase } from './connection';
import { toLocalizedList, type CourseFaq, type LocalizedText } from './common';

export type CatalogFilters = {
  q?: string;
  category?: string;
  level?: CourseLevel;
  language?: Locale;
  price?: 'all' | 'free' | 'paid';
  page?: number;
  pageSize?: number;
};

export type CatalogCourse = {
  id: string;
  slug: string;
  title: CourseDoc['title'];
  subtitle: CourseDoc['subtitle'] | null;
  pricePaisa: number;
  language: Locale;
  level: CourseLevel;
  ratingAverage: number;
  ratingCount: number;
  enrolmentCount: number;
  categoryName: CategoryDoc['name'] | null;
  instructorName: string;
  publishedAt: string | null;
};

export type CatalogPage = {
  courses: CatalogCourse[];
  total: number;
  page: number;
  pageCount: number;
};

export type CatalogCategory = { id: string; slug: string; name: CategoryDoc['name'] };

export type CourseLesson = {
  id: string;
  title: LessonDoc['title'];
  type: LessonDoc['type'];
  bodyHtml: string;
  attachments: LessonDoc['content']['attachments'];
  isPreview: boolean;
  videoUrl: string | null;
  durationMinutes: number;
};

export type CourseSection = {
  id: string;
  title: SectionDoc['title'];
  lessons: CourseLesson[];
  durationMinutes: number;
};

export type CourseInstructor = { id: string; name: string; bio: LocalizedText; image: string | null };

/** Star counts, 5 down to 1, so the page can draw an honest histogram. */
export type RatingBreakdown = { 5: number; 4: number; 3: number; 2: number; 1: number };

export type CourseDetail = CatalogCourse & {
  shortDescription: LocalizedText | null;
  description: LocalizedText | null;
  outcomes: LocalizedText[];
  requirements: LocalizedText[];
  audience: LocalizedText[];
  faqs: CourseFaq[];
  instructor: CourseInstructor;
  sections: CourseSection[];
  lessonCount: number;
  totalDurationMinutes: number;
  ratingBreakdown: RatingBreakdown;
  related: CatalogCourse[];
  updatedAt: string;
};

/** Count ratings by star, ignoring anything outside the 1-5 scale. */
export function ratingBreakdownFor(ratings: number[]): RatingBreakdown {
  const counts: RatingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const rating of ratings) {
    const star = Math.round(rating);
    if (star >= 1 && star <= 5) counts[star as 1 | 2 | 3 | 4 | 5] += 1;
  }
  return counts;
}

/** Sum published study time; lessons without a duration add nothing. */
export function totalDurationMinutes(lessons: Array<Pick<LessonDoc, 'durationMinutes'>>): number {
  return lessons.reduce((total, lesson) => total + (lesson.durationMinutes ?? 0), 0);
}

type CourseRow = CourseDoc & { _id: Types.ObjectId };

/** Read the active category navigation in admin order. */
export async function listCategories(): Promise<CatalogCategory[]> {
  await connectToDatabase();
  const documents = (await Category.find({ isActive: true }).sort({ order: 1 }).lean()) as unknown as Array<
    CategoryDoc & { _id: Types.ObjectId }
  >;
  return documents.map((document) => ({
    id: String(document._id),
    slug: document.slug,
    name: document.name,
  }));
}

/** Query the published catalogue with search, filters and a bounded page size. */
export async function listCatalog(filters: CatalogFilters): Promise<CatalogPage> {
  await connectToDatabase();

  const page = Math.max(1, Math.min(500, Math.floor(filters.page ?? 1)));
  const pageSize = Math.max(1, Math.min(24, Math.floor(filters.pageSize ?? 9)));
  const query: Record<string, unknown> = { status: 'published' };

  if (filters.q?.trim()) {
    query.$text = { $search: filters.q.trim().slice(0, 80) };
  }
  if (filters.level) query.level = filters.level;
  if (filters.language) query.language = filters.language;
  if (filters.price === 'free') query.pricePaisa = 0;
  if (filters.price === 'paid') query.pricePaisa = { $gt: 0 };
  if (filters.category) {
    const category = await Category.findOne({ slug: filters.category, isActive: true }).select('_id').lean();
    query.category = category?._id ?? null;
  }

  const [total, documents, categories] = await Promise.all([
    Course.countDocuments(query),
    Course.find(query)
      .sort({ publishedAt: -1, _id: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean() as unknown as Promise<CourseRow[]>,
    Category.find({ isActive: true }).sort({ order: 1 }).lean() as unknown as Promise<
      Array<CategoryDoc & { _id: Types.ObjectId }>
    >,
  ]);

  const categoryNames = new Map(categories.map((category) => [String(category._id), category.name]));
  const instructorIds = [...new Set(documents.map((document) => String(document.instructor)))];
  const instructors = await User.find({ _id: { $in: instructorIds } }).select('name').lean();
  const instructorNames = new Map(instructors.map((user) => [String(user._id), user.name]));

  return {
    courses: documents.map((document) => toCatalogCourse(document, categoryNames, instructorNames)),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Public course page: published course, ordered curriculum and teacher name. */
export async function getCourseBySlug(slug: string): Promise<CourseDetail | null> {
  await connectToDatabase();

  const course = (await Course.findOne({ slug, status: 'published' }).lean()) as unknown as CourseRow | null;
  if (!course) return null;

  const [category, instructor, sections, lessons, ratings] = await Promise.all([
    Category.findById(course.category).lean() as unknown as Promise<(CategoryDoc & { _id: Types.ObjectId }) | null>,
    User.findById(course.instructor).select('name bio bioEn image').lean(),
    Section.find({ course: course._id }).sort({ order: 1 }).lean() as unknown as Promise<
      Array<SectionDoc & { _id: Types.ObjectId }>
    >,
    Lesson.find({ course: course._id }).sort({ order: 1 }).lean() as unknown as Promise<
      Array<LessonDoc & { _id: Types.ObjectId }>
    >,
    Review.find({ course: course._id }).select('rating').lean(),
  ]);
  // Same-subject courses come first; a young catalogue still fills the row with the next
  // best courses instead of showing an empty section.
  const sameSubject = (await Course.find({ status: 'published', category: course.category, _id: { $ne: course._id } })
    .sort({ ratingAverage: -1, enrolmentCount: -1 })
    .limit(3)
    .lean()) as unknown as CourseRow[];
  const relatedDocs =
    sameSubject.length >= 3
      ? sameSubject
      : [
          ...sameSubject,
          ...((await Course.find({
            status: 'published',
            _id: { $ne: course._id, $nin: sameSubject.map((row) => row._id) },
          })
            .sort({ ratingAverage: -1, enrolmentCount: -1 })
            .limit(3 - sameSubject.length)
            .lean()) as unknown as CourseRow[]),
        ];

  const categoryNames = new Map([[String(course.category), category?.name ?? { bn: '', en: '' }]]);
  // Related courses may be taught by someone else, so resolve their names in one query.
  const relatedInstructorIds = [...new Set(relatedDocs.map((related) => String(related.instructor)))];
  const relatedInstructors = await User.find({ _id: { $in: relatedInstructorIds } }).select('name').lean();
  const instructorNames = new Map(relatedInstructors.map((person) => [String(person._id), person.name]));
  instructorNames.set(String(course.instructor), instructor?.name ?? '');
  const base = toCatalogCourse(course, categoryNames, instructorNames);

  return {
    ...base,
    shortDescription: course.shortDescription ?? null,
    description: course.description ?? null,
    outcomes: toLocalizedList(course.outcomes),
    requirements: toLocalizedList(course.requirements),
    audience: toLocalizedList(course.audience),
    faqs: course.faqs ?? [],
    instructor: {
      id: String(course.instructor),
      name: instructor?.name ?? '',
      bio: { ...(instructor?.bio ? { bn: instructor.bio } : {}), ...(instructor?.bioEn ? { en: instructor.bioEn } : {}) },
      image: instructor?.image ?? null,
    },
    sections: sections.map((section) => {
      const sectionLessons = lessons
        .filter((lesson) => String(lesson.section) === String(section._id))
        .map((lesson) => ({
          id: String(lesson._id),
          title: lesson.title,
          type: lesson.type,
          bodyHtml: lesson.content.bodyHtml ?? '',
          attachments: lesson.content.attachments,
          isPreview: lesson.isPreview,
          videoUrl: lesson.video?.url ?? null,
          durationMinutes: lesson.durationMinutes ?? 0,
        }));
      return {
        id: String(section._id),
        title: section.title,
        lessons: sectionLessons,
        durationMinutes: totalDurationMinutes(sectionLessons),
      };
    }),
    lessonCount: lessons.length,
    totalDurationMinutes: totalDurationMinutes(lessons),
    ratingBreakdown: ratingBreakdownFor(ratings.map((review) => review.rating)),
    related: relatedDocs.map((document) => toCatalogCourse(document, categoryNames, instructorNames)),
    updatedAt: course.updatedAt.toISOString(),
  };
}

export type PreviewLesson = {
  id: string;
  courseTitle: LocalizedText;
  courseSlug: string;
  sectionTitle: LocalizedText;
  title: LocalizedText;
  bodyHtml: string;
  attachments: LessonDoc['content']['attachments'];
  durationMinutes: number;
};

/**
 * A preview lesson is public, so it is looked up through the published course and the
 * lesson's own preview flag; nothing else about the course becomes readable.
 */
export async function getPreviewLesson(slug: string, lessonId: string): Promise<PreviewLesson | null> {
  if (!/^[a-f0-9]{24}$/i.test(lessonId)) return null;
  await connectToDatabase();
  const course = await Course.findOne({ slug, status: 'published' }).select('_id title slug').lean();
  if (!course) return null;
  const lesson = await Lesson.findOne({ _id: lessonId, course: course._id, isPreview: true }).lean();
  if (!lesson) return null;
  const section = await Section.findById(lesson.section).select('title').lean();
  return {
    id: String(lesson._id),
    courseTitle: course.title,
    courseSlug: course.slug,
    sectionTitle: section?.title ?? {},
    title: lesson.title,
    bodyHtml: lesson.content.bodyHtml ?? '',
    attachments: lesson.content.attachments,
    durationMinutes: lesson.durationMinutes ?? 0,
  };
}

/** Instructor studio list: every status for the owner, or all courses for an admin. */
export async function listAuthorCourses(userId: string, isAdmin: boolean): Promise<CatalogCourse[]> {
  await connectToDatabase();
  const filter = isAdmin ? {} : { instructor: userId };
  const documents = (await Course.find(filter).sort({ updatedAt: -1 }).limit(50).lean()) as unknown as CourseRow[];
  const categoryIds = [...new Set(documents.map((document) => String(document.category)))];
  const instructorIds = [...new Set(documents.map((document) => String(document.instructor)))];
  const [categories, instructors] = await Promise.all([
    Category.find({ _id: { $in: categoryIds } }).lean() as unknown as Promise<
      Array<CategoryDoc & { _id: Types.ObjectId }>
    >,
    User.find({ _id: { $in: instructorIds } }).select('name').lean(),
  ]);
  const categoryNames = new Map(categories.map((category) => [String(category._id), category.name]));
  const instructorNames = new Map(instructors.map((user) => [String(user._id), user.name]));
  return documents.map((document) => toCatalogCourse(document, categoryNames, instructorNames));
}

/** Build the common card shape from a lean course document. */
function toCatalogCourse(
  document: CourseRow,
  categoryNames: Map<string, CategoryDoc['name']>,
  instructorNames: Map<string, string>,
): CatalogCourse {
  return {
    id: String(document._id),
    slug: document.slug,
    title: document.title,
    subtitle: document.shortDescription ?? document.subtitle ?? null,
    pricePaisa: document.salePricePaisa ?? document.pricePaisa,
    language: document.language,
    level: document.level,
    ratingAverage: document.ratingAverage,
    ratingCount: document.ratingCount,
    enrolmentCount: document.enrolmentCount,
    categoryName: categoryNames.get(String(document.category)) ?? null,
    instructorName: instructorNames.get(String(document.instructor)) ?? '',
    publishedAt: document.publishedAt?.toISOString() ?? null,
  };
}

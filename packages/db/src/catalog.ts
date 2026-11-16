import type { Types } from 'mongoose';
import type { Locale } from '@pathshala/shared';
import { Category, type CategoryDoc } from './models/category';
import { Course, type CourseDoc, type CourseLevel } from './models/course';
import { Lesson, type LessonDoc } from './models/lesson';
import { Section, type SectionDoc } from './models/section';
import { User } from './models/user';
import { connectToDatabase } from './connection';

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
};

export type CourseSection = { id: string; title: SectionDoc['title']; lessons: CourseLesson[] };

export type CourseDetail = CatalogCourse & {
  description: CourseDoc['description'];
  outcomes: string[];
  requirements: string[];
  sections: CourseSection[];
  lessonCount: number;
};

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

  const [category, instructor, sections, lessons] = await Promise.all([
    Category.findById(course.category).lean() as unknown as Promise<(CategoryDoc & { _id: Types.ObjectId }) | null>,
    User.findById(course.instructor).select('name').lean(),
    Section.find({ course: course._id }).sort({ order: 1 }).lean() as unknown as Promise<
      Array<SectionDoc & { _id: Types.ObjectId }>
    >,
    Lesson.find({ course: course._id }).sort({ order: 1 }).lean() as unknown as Promise<
      Array<LessonDoc & { _id: Types.ObjectId }>
    >,
  ]);

  const categoryNames = new Map([[String(course.category), category?.name ?? { bn: '', en: '' }]]);
  const instructorNames = new Map([[String(course.instructor), instructor?.name ?? '']]);
  const base = toCatalogCourse(course, categoryNames, instructorNames);

  return {
    ...base,
    description: course.description,
    outcomes: course.outcomes,
    requirements: course.requirements,
    sections: sections.map((section) => ({
      id: String(section._id),
      title: section.title,
      lessons: lessons
        .filter((lesson) => String(lesson.section) === String(section._id))
        .map((lesson) => ({
          id: String(lesson._id),
          title: lesson.title,
          type: lesson.type,
          bodyHtml: lesson.content.bodyHtml ?? '',
          attachments: lesson.content.attachments,
          isPreview: lesson.isPreview,
          videoUrl: lesson.video?.url ?? null,
        })),
    })),
    lessonCount: lessons.length,
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
    subtitle: document.subtitle ?? null,
    pricePaisa: document.pricePaisa,
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

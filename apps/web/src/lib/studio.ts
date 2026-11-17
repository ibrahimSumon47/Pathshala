import 'server-only';
import {
  Course,
  Lesson,
  QuizQuestion,
  Section,
  connectToDatabase,
  toLocalizedList,
  type CourseFaq,
  type LocalizedText,
} from '@pathshala/db';

type StudioLesson = {
  id: string;
  title: { bn?: string; en?: string };
  type: 'reading' | 'video' | 'quiz';
  bodyHtml: string;
  attachmentCount: number;
  videoUrl: string;
  durationMinutes: number;
  isPreview: boolean;
};

type StudioSection = {
  id: string;
  title: { bn?: string; en?: string };
  lessons: StudioLesson[];
};

export type QuizQuestionView = { id: string; prompt: string; type: string; options: string[]; correctIndexes: number[]; points: number };

export type StudioQuiz = {
  courseTitle: { bn?: string; en?: string };
  lessonTitle: { bn?: string; en?: string };
  lessonType: string;
  questions: QuizQuestionView[];
};

export type StudioCourse = {
  id: string;
  slug: string;
  title: { bn?: string; en?: string };
  subtitle: { bn?: string; en?: string };
  shortDescription: { bn?: string; en?: string };
  description: { bn?: string; en?: string };
  outcomes: LocalizedText[];
  requirements: LocalizedText[];
  audience: LocalizedText[];
  faqs: CourseFaq[];
  categoryId: string;
  pricePaisa: number;
  level: 'beginner' | 'intermediate' | 'advanced';
  language: 'bn' | 'en';
  status: 'draft' | 'pending' | 'published' | 'archived';
  sections: StudioSection[];
  lessonCount: number;
};

/** Load one quiz lesson and its questions, scoped to the owning instructor or an admin. */
export async function getStudioQuiz(
  courseId: string,
  lessonId: string,
  userId: string,
  isAdmin: boolean,
): Promise<StudioQuiz | null> {
  if (!/^[a-f0-9]{24}$/i.test(courseId) || !/^[a-f0-9]{24}$/i.test(lessonId)) return null;
  await connectToDatabase();
  const course = await Course.findOne(isAdmin ? { _id: courseId } : { _id: courseId, instructor: userId }).lean();
  if (!course) return null;
  const lesson = await Lesson.findOne({ _id: lessonId, course: course._id }).lean();
  if (!lesson) return null;
  const questions = await QuizQuestion.find({ lesson: lesson._id }).sort({ order: 1 }).lean();
  return {
    courseTitle: course.title,
    lessonTitle: lesson.title,
    lessonType: lesson.type,
    questions: questions.map((question) => ({
      id: String(question._id),
      prompt: question.prompt,
      type: question.type,
      options: question.options,
      correctIndexes: question.correctIndexes,
      points: question.points,
    })),
  };
}

/** Load one editable course, scoped to its instructor unless the caller is an admin. */
export async function getStudioCourse(courseId: string, userId: string, isAdmin: boolean): Promise<StudioCourse | null> {
  if (!/^[a-f0-9]{24}$/i.test(courseId)) return null;
  await connectToDatabase();

  const course = await Course.findOne(isAdmin ? { _id: courseId } : { _id: courseId, instructor: userId }).lean();
  if (!course) return null;

  const [sections, lessons] = await Promise.all([
    Section.find({ course: course._id }).sort({ order: 1 }).lean(),
    Lesson.find({ course: course._id }).sort({ order: 1 }).lean(),
  ]);

  return {
    id: String(course._id),
    slug: course.slug,
    title: course.title,
    subtitle: course.subtitle ?? {},
    shortDescription: course.shortDescription ?? {},
    description: course.description ?? {},
    outcomes: toLocalizedList(course.outcomes),
    requirements: toLocalizedList(course.requirements),
    audience: toLocalizedList(course.audience),
    faqs: course.faqs ?? [],
    categoryId: String(course.category),
    pricePaisa: course.pricePaisa,
    level: course.level,
    language: course.language,
    status: course.status,
    lessonCount: lessons.length,
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
          attachmentCount: lesson.content.attachments.length,
          videoUrl: lesson.video?.url ?? '',
          durationMinutes: lesson.durationMinutes ?? 0,
          isPreview: lesson.isPreview,
        })),
    })),
  };
}

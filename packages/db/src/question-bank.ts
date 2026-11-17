import { Types } from 'mongoose';
import { connectToDatabase } from './connection';
import { Course } from './models/course';
import { Lesson } from './models/lesson';
import { QuestionBankItem } from './models/question-bank-item';
import { QuizQuestion, type QuizType } from './models/quiz';

export type BankQuestionRow = {
  id: string;
  prompt: string;
  type: QuizType;
  options: string[];
  correctIndexes: number[];
  explanation: string;
  points: number;
  sourceCourseTitle: { bn?: string; en?: string } | null;
  createdAt: string;
};

/** A teacher's reusable questions, newest first, with the course they came from. */
export async function listQuestionBank(instructorId: string): Promise<BankQuestionRow[]> {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(instructorId)) return [];
  const items = await QuestionBankItem.find({ instructor: instructorId })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  if (items.length === 0) return [];
  const courses = await Course.find({
    _id: { $in: items.map((item) => item.sourceCourse).filter(Boolean) },
  })
    .select('title')
    .lean();
  const titles = new Map(courses.map((course) => [String(course._id), course.title]));
  return items.map((item) => ({
    id: String(item._id),
    prompt: item.prompt,
    type: item.type,
    options: item.options,
    correctIndexes: item.correctIndexes,
    explanation: item.explanation ?? '',
    points: item.points,
    sourceCourseTitle: item.sourceCourse ? titles.get(String(item.sourceCourse)) ?? null : null,
    createdAt: item.createdAt.toISOString(),
  }));
}

/**
 * Copy one live quiz question into the teacher's bank. Only the owning teacher (or an
 * admin) may read the source question; the same prompt is stored once per teacher.
 */
export async function saveQuestionToBank(input: {
  instructorId: string;
  questionId: string;
  isAdmin: boolean;
}): Promise<'saved' | 'exists' | 'not_found'> {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(input.questionId)) return 'not_found';
  const question = await QuizQuestion.findById(input.questionId).lean();
  if (!question) return 'not_found';
  const course = await Course.findById(question.course).select('instructor').lean();
  if (!course || (!input.isAdmin && String(course.instructor) !== input.instructorId)) return 'not_found';
  const exists = await QuestionBankItem.exists({ instructor: input.instructorId, prompt: question.prompt });
  if (exists) return 'exists';
  await QuestionBankItem.create({
    instructor: input.instructorId,
    sourceCourse: question.course,
    prompt: question.prompt,
    type: question.type,
    options: question.options,
    correctIndexes: question.correctIndexes,
    explanation: question.explanation ?? '',
    points: question.points,
  });
  return 'saved';
}

/**
 * Append a bank question to a quiz lesson. The target lesson must belong to a course the
 * teacher owns, and a prompt already present in that quiz is not inserted twice.
 */
export async function addBankItemToQuiz(input: {
  bankItemId: string;
  lessonId: string;
  instructorId: string;
  isAdmin: boolean;
}): Promise<'added' | 'duplicate' | 'not_found'> {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(input.bankItemId) || !Types.ObjectId.isValid(input.lessonId)) return 'not_found';
  const item = await QuestionBankItem.findOne({
    _id: input.bankItemId,
    instructor: input.instructorId,
  }).lean();
  if (!item) return 'not_found';
  const lesson = await Lesson.findById(input.lessonId).select('course type').lean();
  if (!lesson || lesson.type !== 'quiz') return 'not_found';
  const course = await Course.findById(lesson.course).select('instructor').lean();
  if (!course || (!input.isAdmin && String(course.instructor) !== input.instructorId)) return 'not_found';

  const duplicate = await QuizQuestion.exists({ lesson: lesson._id, prompt: item.prompt });
  if (duplicate) return 'duplicate';
  const last = await QuizQuestion.findOne({ lesson: lesson._id }).sort({ order: -1 }).select('order').lean();
  await QuizQuestion.create({
    course: lesson.course,
    lesson: lesson._id,
    prompt: item.prompt,
    type: item.type,
    options: item.options,
    correctIndexes: item.correctIndexes,
    explanation: item.explanation ?? '',
    points: item.points,
    order: (last?.order ?? 0) + 1,
  });
  return 'added';
}

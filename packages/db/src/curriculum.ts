import { Types } from 'mongoose';
import { connectToDatabase } from './connection';
import { Course } from './models/course';
import { Lesson } from './models/lesson';

export type MoveLessonResult = 'moved' | 'edge' | 'not_found';

/** Positions are rewritten in this band first, so the unique (section, order) index never collides. */
const TEMP_ORDER_OFFSET = 10_000;

/**
 * Move one lesson up or down inside its section. Sibling orders are normalised to 1..n in
 * two passes: the first pass parks every row above the real range, the second writes the
 * final positions. A plain two-row swap would hit the unique index halfway through.
 */
export async function moveLesson(input: {
  courseId: string;
  lessonId: string;
  instructorId: string;
  isAdmin: boolean;
  direction: 'up' | 'down';
}): Promise<MoveLessonResult> {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(input.courseId) || !Types.ObjectId.isValid(input.lessonId)) return 'not_found';
  const course = await Course.findOne(
    input.isAdmin ? { _id: input.courseId } : { _id: input.courseId, instructor: input.instructorId },
  )
    .select('_id')
    .lean();
  if (!course) return 'not_found';
  const lesson = await Lesson.findOne({ _id: input.lessonId, course: course._id }).select('section').lean();
  if (!lesson) return 'not_found';

  const siblings = await Lesson.find({ course: course._id, section: lesson.section })
    .sort({ order: 1, _id: 1 })
    .select('_id')
    .limit(200)
    .lean();
  const index = siblings.findIndex((sibling) => String(sibling._id) === input.lessonId);
  const target = index + (input.direction === 'up' ? -1 : 1);
  if (index < 0) return 'not_found';
  if (target < 0 || target >= siblings.length) return 'edge';

  const reordered = [...siblings];
  [reordered[index], reordered[target]] = [reordered[target]!, reordered[index]!];

  for (const [position, sibling] of reordered.entries()) {
    await Lesson.updateOne({ _id: sibling._id }, { order: TEMP_ORDER_OFFSET + position + 1 });
  }
  for (const [position, sibling] of reordered.entries()) {
    await Lesson.updateOne({ _id: sibling._id }, { order: position + 1 });
  }
  return 'moved';
}

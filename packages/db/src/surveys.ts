import { Types } from 'mongoose';
import { connectToDatabase } from './connection';
import { CompletionSurvey } from './models/completion-survey';
import { Course } from './models/course';
import { Enrolment } from './models/enrolment';

export type SurveyAnswers = {
  difficulty: number;
  pace: number;
  confidence: number;
  comment: string;
};

export type SurveyableCourse = {
  courseId: string;
  slug: string;
  title: { bn?: string; en?: string };
  completedAt: string | null;
  survey: SurveyAnswers & { updatedAt: string } | null;
};

export type SurveyComment = { id: string; body: string; updatedAt: string };

export type CourseSurveySummary = {
  count: number;
  difficulty: number;
  pace: number;
  confidence: number;
  /** Anonymous excerpts; hidden rows are excluded just like a hidden review. */
  comments: SurveyComment[];
};

/** Average one survey scale, rounded to one decimal so the UI can print it honestly. */
function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((total, value) => total + value, 0) / values.length) * 10) / 10;
}

/** Every scale is 1-5; a non-integer or out-of-range answer is refused at the boundary. */
export function validSurveyAnswers(input: SurveyAnswers): boolean {
  return [input.difficulty, input.pace, input.confidence].every(
    (value) => Number.isInteger(value) && value >= 1 && value <= 5,
  );
}

/** Completed courses with the learner's own answer, so the page can prefill an edit. */
export async function getSurveyableCourses(studentId: string): Promise<SurveyableCourse[]> {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(studentId)) return [];
  const enrolments = await Enrolment.find({ student: studentId, status: 'completed' })
    .sort({ completedAt: -1 })
    .limit(50)
    .lean();
  if (enrolments.length === 0) return [];
  const [courses, surveys] = await Promise.all([
    Course.find({ _id: { $in: enrolments.map((enrolment) => enrolment.course) } })
      .select('title slug')
      .lean(),
    CompletionSurvey.find({
      student: studentId,
      course: { $in: enrolments.map((enrolment) => enrolment.course) },
    }).lean(),
  ]);
  const courseMap = new Map(courses.map((course) => [String(course._id), course]));
  const surveyMap = new Map(surveys.map((survey) => [String(survey.course), survey]));
  return enrolments.flatMap((enrolment) => {
    const course = courseMap.get(String(enrolment.course));
    if (!course) return [];
    const survey = surveyMap.get(String(enrolment.course));
    return [
      {
        courseId: String(course._id),
        slug: course.slug,
        title: course.title,
        completedAt: enrolment.completedAt?.toISOString() ?? null,
        survey: survey
          ? {
              difficulty: survey.difficulty,
              pace: survey.pace,
              confidence: survey.confidence,
              comment: survey.comment ?? '',
              updatedAt: survey.updatedAt.toISOString(),
            }
          : null,
      },
    ];
  });
}

/**
 * Save one answer per completed course. A resubmission edits the same row so a learner can
 * correct a misread scale; an unfinished or refunded course cannot be reviewed here.
 */
export async function submitCompletionSurvey(
  studentId: string,
  courseId: string,
  input: SurveyAnswers,
): Promise<'saved' | 'invalid' | 'not_completed'> {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(studentId) || !Types.ObjectId.isValid(courseId)) return 'not_completed';
  if (!validSurveyAnswers(input)) return 'invalid';
  const enrolment = await Enrolment.findOne({ student: studentId, course: courseId, status: 'completed' })
    .select('_id')
    .lean();
  if (!enrolment) return 'not_completed';
  await CompletionSurvey.findOneAndUpdate(
    { student: studentId, course: courseId },
    {
      $set: {
        difficulty: input.difficulty,
        pace: input.pace,
        confidence: input.confidence,
        comment: input.comment.trim().slice(0, 500),
      },
    },
    { upsert: true, returnDocument: 'after' },
  );
  return 'saved';
}

/** Anonymous averages and comment excerpts for one course, used by the teacher roster. */
export async function getCourseSurveySummary(courseId: string): Promise<CourseSurveySummary> {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(courseId)) return { count: 0, difficulty: 0, pace: 0, confidence: 0, comments: [] };
  const rows = await CompletionSurvey.find({ course: courseId, hidden: { $ne: true } })
    .sort({ updatedAt: -1 })
    .select('difficulty pace confidence comment updatedAt')
    .lean();
  return {
    count: rows.length,
    difficulty: average(rows.map((row) => row.difficulty)),
    pace: average(rows.map((row) => row.pace)),
    confidence: average(rows.map((row) => row.confidence)),
    comments: rows
      .filter((row) => row.comment.trim().length > 0)
      .slice(0, 10)
      .map((row) => ({ id: String(row._id), body: row.comment, updatedAt: row.updatedAt.toISOString() })),
  };
}

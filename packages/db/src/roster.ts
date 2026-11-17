import { Types } from 'mongoose';
import { connectToDatabase } from './connection';
import { Certificate } from './models/certificate';
import { Course } from './models/course';
import { CompletionSurvey } from './models/completion-survey';
import { Enrolment } from './models/enrolment';
import { User } from './models/user';
import { getCourseSurveySummary, type CourseSurveySummary } from './surveys';

export type RosterStudent = {
  id: string;
  name: string;
  email: string;
  progressPercent: number;
  status: 'active' | 'completed' | 'refunded';
  enrolledAt: string;
  completedAt: string | null;
  certificateCode: string | null;
  surveySubmitted: boolean;
};

export type CourseRoster = {
  courseId: string;
  courseSlug: string;
  courseTitle: { bn?: string; en?: string };
  students: RosterStudent[];
  total: number;
  completed: number;
  averageProgress: number;
  survey: CourseSurveySummary;
};

/** Round an average to one decimal; an empty roster reports zero rather than NaN. */
function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((total, value) => total + value, 0) / values.length) * 10) / 10;
}

/**
 * The people actually enrolled in one course, newest first, with progress and the
 * certificate they earned. Only the owning teacher or an admin can read it.
 */
export async function getCourseRoster(
  courseId: string,
  instructorId: string,
  isAdmin: boolean,
): Promise<CourseRoster | null> {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(courseId)) return null;
  const course = await Course.findOne(isAdmin ? { _id: courseId } : { _id: courseId, instructor: instructorId })
    .select('title slug')
    .lean();
  if (!course) return null;

  // Refunded enrolments lost access, so they are not part of the current class.
  const enrolments = await Enrolment.find({ course: course._id, status: { $ne: 'refunded' } })
    .sort({ enrolledAt: -1 })
    .limit(500)
    .lean();
  const studentIds = enrolments.map((enrolment) => enrolment.student);
  const [students, certificates, surveys] = await Promise.all([
    User.find({ _id: { $in: studentIds } }).select('name email').lean(),
    Certificate.find({ course: course._id, student: { $in: studentIds } }).select('student code').lean(),
    CompletionSurvey.find({ course: course._id, student: { $in: studentIds } })
      .select('student')
      .lean(),
  ]);
  const people = new Map(students.map((student) => [String(student._id), student]));
  const certificateCodes = new Map(certificates.map((certificate) => [String(certificate.student), certificate.code]));
  const surveyStudents = new Set(surveys.map((survey) => String(survey.student)));

  return {
    courseId: String(course._id),
    courseSlug: course.slug,
    courseTitle: course.title,
    students: enrolments.flatMap((enrolment) => {
      const student = people.get(String(enrolment.student));
      if (!student) return [];
      return [
        {
          id: String(student._id),
          name: student.name,
          email: student.email,
          progressPercent: enrolment.progressPercent,
          status: enrolment.status,
          enrolledAt: enrolment.enrolledAt.toISOString(),
          completedAt: enrolment.completedAt?.toISOString() ?? null,
          certificateCode: certificateCodes.get(String(student._id)) ?? null,
          surveySubmitted: surveyStudents.has(String(student._id)),
        },
      ];
    }),
    total: enrolments.length,
    completed: enrolments.filter((enrolment) => enrolment.status === 'completed').length,
    averageProgress: average(enrolments.map((enrolment) => enrolment.progressPercent)),
    survey: await getCourseSurveySummary(String(course._id)),
  };
}

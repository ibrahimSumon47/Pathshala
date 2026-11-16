import { Types } from 'mongoose';
import { connectToDatabase } from './connection';
import { Attendance } from './models/attendance';
import { Course } from './models/course';
import { Enrolment } from './models/enrolment';
import { Order } from './models/order';

export type InstructorCourseAnalytics = {
  id: string;
  slug: string;
  title: { bn?: string; en?: string };
  status: string;
  paidSales: number;
  revenuePaisa: number;
  enrolmentCount: number;
  completionCount: number;
  attendanceCount: number;
};

export type InstructorAnalytics = {
  revenuePaisa: number;
  paidSales: number;
  studentCount: number;
  completionPercent: number;
  attendanceCount: number;
  courses: InstructorCourseAnalytics[];
};

type CountRow = { _id: Types.ObjectId; count: number };
type RevenueRow = { _id: Types.ObjectId; count: number; total: number };

/** Clamp a percentage so a broken counter can never render outside 0-100. */
function percent(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((part / total) * 100)));
}

/**
 * Per-instructor sales, enrolment and completion numbers. Every aggregate is scoped to the
 * instructor's own course ids; there is no client-supplied id in this read path.
 */
export async function getInstructorAnalytics(instructorId: string): Promise<InstructorAnalytics> {
  await connectToDatabase();
  const courses = await Course.find({ instructor: instructorId }).select('title slug status').lean();
  const courseIds = courses.map((course) => course._id);

  const [revenueRows, enrolments, completions, attendanceRows, orderRows] = await Promise.all([
    Order.aggregate<{ count: number; total: number }>([
      { $match: { instructor: new Types.ObjectId(instructorId), status: 'paid' } },
      { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$totalPaisa' } } },
    ]),
    Enrolment.aggregate<CountRow>([
      { $match: { course: { $in: courseIds }, status: { $ne: 'refunded' } } },
      { $group: { _id: '$course', count: { $sum: 1 } } },
    ]),
    Enrolment.aggregate<CountRow>([
      { $match: { course: { $in: courseIds }, status: 'completed' } },
      { $group: { _id: '$course', count: { $sum: 1 } } },
    ]),
    Attendance.aggregate<CountRow>([
      { $match: { course: { $in: courseIds } } },
      { $group: { _id: '$course', count: { $sum: 1 } } },
    ]),
    Order.aggregate<RevenueRow>([
      { $match: { course: { $in: courseIds }, status: 'paid' } },
      { $group: { _id: '$course', count: { $sum: 1 }, total: { $sum: '$totalPaisa' } } },
    ]),
  ]);

  const revenue = revenueRows[0] ?? { count: 0, total: 0 };
  const enrolmentMap = new Map(enrolments.map((row) => [String(row._id), row.count]));
  const completionMap = new Map(completions.map((row) => [String(row._id), row.count]));
  const attendanceMap = new Map(attendanceRows.map((row) => [String(row._id), row.count]));
  const orderMap = new Map(orderRows.map((row) => [String(row._id), row]));

  const totalEnrolments = [...enrolmentMap.values()].reduce((sum, count) => sum + count, 0);
  const totalCompletions = [...completionMap.values()].reduce((sum, count) => sum + count, 0);
  const uniqueStudents = await Enrolment.distinct('student', {
    course: { $in: courseIds },
    status: { $ne: 'refunded' },
  });

  return {
    revenuePaisa: revenue.total,
    paidSales: revenue.count,
    studentCount: uniqueStudents.length,
    completionPercent: percent(totalCompletions, totalEnrolments),
    attendanceCount: [...attendanceMap.values()].reduce((sum, count) => sum + count, 0),
    courses: courses.map((course) => ({
      id: String(course._id),
      slug: course.slug,
      title: course.title,
      status: course.status,
      paidSales: orderMap.get(String(course._id))?.count ?? 0,
      revenuePaisa: orderMap.get(String(course._id))?.total ?? 0,
      enrolmentCount: enrolmentMap.get(String(course._id)) ?? 0,
      completionCount: completionMap.get(String(course._id)) ?? 0,
      attendanceCount: attendanceMap.get(String(course._id)) ?? 0,
    })),
  };
}

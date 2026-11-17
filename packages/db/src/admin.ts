import { Types } from 'mongoose';
import { connectToDatabase } from './connection';
import { AuditEvent } from './models/audit-event';
import { Certificate } from './models/certificate';
import { CompletionSurvey } from './models/completion-survey';
import { Course, type CourseStatus } from './models/course';
import { Enrolment } from './models/enrolment';
import { LiveSession } from './models/live-session';
import { Order } from './models/order';
import { User } from './models/user';
import { PLATFORM_SHARE_PERCENT } from './commerce';

export type AdminCourseRow = {
  id: string;
  slug: string;
  title: { bn?: string; en?: string };
  status: string;
  instructorName: string;
  pricePaisa: number;
  updatedAt: string;
};

export type AuditRow = {
  id: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type AdminReport = {
  users: number;
  courses: number;
  publishedCourses: number;
  enrolments: number;
  certificates: number;
  liveSessions: number;
  paidOrders: number;
  revenuePaisa: number;
  refundedPaisa: number;
  platformPaisa: number;
  platformSharePercent: number;
  averageOrderPaisa: number;
};

export type PlatformRevenue = {
  grossPaisa: number;
  refundedPaisa: number;
  platformPaisa: number;
  paidOrders: number;
  refundedOrders: number;
  averageOrderPaisa: number;
  sharePercent: number;
};

/**
 * Read the platform share from orders that still exist. A ledger alone is not safe here:
 * removed test orders can leave their rows behind, which would push the share above gross.
 * Orders written before the field existed fall back to the same 20% integer rule.
 */
export async function getPlatformRevenue(): Promise<PlatformRevenue> {
  await connectToDatabase();
  const [report] = await Order.aggregate<{
    paid: Array<{ total: number; count: number; platform: number }>;
    refunded: Array<{ total: number; count: number }>;
  }>([
    {
      $facet: {
        paid: [
          { $match: { status: 'paid' } },
          {
            $group: {
              _id: null,
              total: { $sum: '$totalPaisa' },
              count: { $sum: 1 },
              platform: {
                $sum: {
                  $ifNull: [
                    '$platformFeePaisa',
                    { $round: [{ $divide: [{ $multiply: ['$totalPaisa', PLATFORM_SHARE_PERCENT] }, 100] }, 0] },
                  ],
                },
              },
            },
          },
        ],
        refunded: [
          { $match: { status: 'refunded' } },
          { $group: { _id: null, total: { $sum: '$totalPaisa' }, count: { $sum: 1 } } },
        ],
      },
    },
  ]);
  const paidOrders = report?.paid[0]?.count ?? 0;
  const grossPaisa = report?.paid[0]?.total ?? 0;
  return {
    grossPaisa,
    refundedPaisa: report?.refunded[0]?.total ?? 0,
    platformPaisa: report?.paid[0]?.platform ?? 0,
    paidOrders,
    refundedOrders: report?.refunded[0]?.count ?? 0,
    averageOrderPaisa: paidOrders > 0 ? Math.round(grossPaisa / paidOrders) : 0,
    sharePercent: PLATFORM_SHARE_PERCENT,
  };
}

type AuditInput = {
  actor: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
};

/** Append one audit row. Callers pass ids and safe context only, never secrets. */
export async function recordAuditEvent(input: AuditInput): Promise<void> {
  await connectToDatabase();
  const event: {
    actor: Types.ObjectId | null;
    action: string;
    entityType: string;
    metadata: Record<string, unknown>;
    entityId?: Types.ObjectId;
    ip?: string;
    userAgent?: string;
  } = {
    actor: Types.ObjectId.isValid(input.actor) ? new Types.ObjectId(input.actor) : null,
    action: input.action.slice(0, 80),
    entityType: input.entityType.slice(0, 40),
    metadata: input.metadata ?? {},
  };
  if (input.entityId && Types.ObjectId.isValid(input.entityId)) event.entityId = new Types.ObjectId(input.entityId);
  if (input.ip) event.ip = input.ip.slice(0, 80);
  if (input.userAgent) event.userAgent = input.userAgent.slice(0, 400);
  await AuditEvent.create(event);
}

/** One screen of operating numbers for the admin overview. */
export async function getAdminReport(): Promise<AdminReport> {
  await connectToDatabase();
  const [users, courses, publishedCourses, enrolments, certificates, liveSessions, paidOrders, revenue, platform] = await Promise.all([
    User.countDocuments(),
    Course.countDocuments(),
    Course.countDocuments({ status: 'published' }),
    Enrolment.countDocuments({ status: { $ne: 'refunded' } }),
    Certificate.countDocuments({ revokedAt: null }),
    LiveSession.countDocuments(),
    Order.countDocuments({ status: 'paid' }),
    Order.aggregate<{ total: number }>([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalPaisa' } } },
    ]),
    getPlatformRevenue(),
  ]);
  return {
    users,
    courses,
    publishedCourses,
    enrolments,
    certificates,
    liveSessions,
    paidOrders,
    revenuePaisa: revenue[0]?.total ?? 0,
    refundedPaisa: platform.refundedPaisa,
    platformPaisa: platform.platformPaisa,
    platformSharePercent: platform.sharePercent,
    averageOrderPaisa: platform.averageOrderPaisa,
  };
}

/** Courses waiting for or holding a published state, with their instructor. */
export async function listAdminCourses(): Promise<AdminCourseRow[]> {
  await connectToDatabase();
  const courses = await Course.find().sort({ updatedAt: -1 }).limit(100).lean();
  const instructors = await User.find({ _id: { $in: courses.map((course) => course.instructor) } })
    .select('name')
    .lean();
  const names = new Map(instructors.map((instructor) => [String(instructor._id), instructor.name]));
  return courses.map((course) => ({
    id: String(course._id),
    slug: course.slug,
    title: course.title,
    status: course.status,
    instructorName: names.get(String(course.instructor)) ?? 'Instructor',
    pricePaisa: course.pricePaisa,
    updatedAt: course.updatedAt.toISOString(),
  }));
}

/** Recent audit rows with the actor's display name resolved in one query. */
export async function listAuditEvents(limit = 30): Promise<AuditRow[]> {
  await connectToDatabase();
  const rows = await AuditEvent.find().sort({ createdAt: -1 }).limit(Math.min(limit, 200)).lean();
  const actors = await User.find({ _id: { $in: rows.map((row) => row.actor).filter(Boolean) } })
    .select('name')
    .lean();
  const names = new Map(actors.map((actor) => [String(actor._id), actor.name]));
  return rows.map((row) => ({
    id: String(row._id),
    actorName: row.actor ? names.get(String(row.actor)) ?? 'Admin' : 'System',
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId ? String(row.entityId) : '',
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: row.createdAt.toISOString(),
  }));
}

/** Publish, unpublish or archive a course and leave an audit trail. */
export async function setCourseStatus(
  courseId: string,
  status: CourseStatus,
  actorId: string,
): Promise<boolean> {
  await connectToDatabase();
  const allowed: CourseStatus[] = ['draft', 'pending', 'published', 'archived'];
  if (!allowed.includes(status) || !Types.ObjectId.isValid(courseId)) return false;
  const course = await Course.findById(courseId).select('status slug').lean();
  if (!course) return false;
  await Course.updateOne(
    { _id: courseId },
    { status, publishedAt: status === 'published' ? new Date() : null },
  );
  await recordAuditEvent({
    actor: actorId,
    action: 'course.status',
    entityType: 'course',
    entityId: courseId,
    metadata: { from: course.status, to: status, slug: course.slug },
  });
  return true;
}

/** Grant or revoke instructor access; admins and the acting account are immutable here. */
export async function setInstructorAccess(
  userId: string,
  grant: boolean,
  actorId: string,
): Promise<boolean> {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(userId) || userId === actorId) return false;
  const target = await User.findById(userId).select('roles email').lean();
  if (!target || target.roles.includes('admin')) return false;
  const roles = new Set(target.roles);
  if (grant) roles.add('instructor');
  else roles.delete('instructor');
  roles.add('student');
  await User.updateOne({ _id: userId }, { roles: [...roles] });
  await recordAuditEvent({
    actor: actorId,
    action: grant ? 'user.instructor_grant' : 'user.instructor_revoke',
    entityType: 'user',
    entityId: userId,
    metadata: { email: target.email },
  });
  return true;
}

/** Audit rows for CSV export, capped so one request cannot exhaust memory. */
export async function getAuditRowsForExport(limit = 2000): Promise<AuditRow[]> {
  return listAuditEvents(Math.min(limit, 2000));
}

export type ModerationReviewRow = {
  id: string;
  courseTitle: { bn?: string; en?: string };
  author: string;
  rating: number;
  body: string;
  hidden: boolean;
  createdAt: string;
};

export type ModerationQuestionRow = {
  id: string;
  courseTitle: { bn?: string; en?: string };
  lessonTitle: { bn?: string; en?: string };
  author: string;
  body: string;
  answers: number;
  hidden: boolean;
  createdAt: string;
};

export type ModerationSurveyRow = {
  id: string;
  courseTitle: { bn?: string; en?: string };
  comment: string;
  hidden: boolean;
  createdAt: string;
};

/** Recent reviews and lesson questions, including hidden ones, for the moderation desk. */
export async function listModerationQueue(): Promise<{
  reviews: ModerationReviewRow[];
  questions: ModerationQuestionRow[];
  surveys: ModerationSurveyRow[];
}> {
  await connectToDatabase();
  const { Review } = await import('./models/review');
  const { Question } = await import('./models/question');
  const { Lesson } = await import('./models/lesson');
  const [reviews, questions, surveys] = await Promise.all([
    Review.find().sort({ createdAt: -1 }).limit(20).lean(),
    Question.find().sort({ createdAt: -1 }).limit(20).lean(),
    CompletionSurvey.find({ comment: { $ne: '' } }).sort({ createdAt: -1 }).limit(20).lean(),
  ]);
  const courseIds = [
    ...new Set([
      ...reviews.map((review) => review.course),
      ...questions.map((question) => question.course),
      ...surveys.map((survey) => survey.course),
    ]),
  ];
  const lessonIds = [...new Set(questions.map((question) => question.lesson))];
  const authorIds = [...new Set([...reviews.map((review) => review.student), ...questions.map((question) => question.author)])];
  const [courses, lessons, authors] = await Promise.all([
    Course.find({ _id: { $in: courseIds } }).select('title').lean(),
    Lesson.find({ _id: { $in: lessonIds } }).select('title').lean(),
    User.find({ _id: { $in: authorIds } }).select('name').lean(),
  ]);
  const courseTitles = new Map(courses.map((course) => [String(course._id), course.title]));
  const lessonTitles = new Map(lessons.map((lesson) => [String(lesson._id), lesson.title]));
  const names = new Map(authors.map((author) => [String(author._id), author.name]));
  return {
    reviews: reviews.map((review) => ({
      id: String(review._id),
      courseTitle: courseTitles.get(String(review.course)) ?? {},
      author: names.get(String(review.student)) ?? 'Learner',
      rating: review.rating,
      body: review.body,
      hidden: Boolean(review.hidden),
      createdAt: review.createdAt.toISOString(),
    })),
    questions: questions.map((question) => ({
      id: String(question._id),
      courseTitle: courseTitles.get(String(question.course)) ?? {},
      lessonTitle: lessonTitles.get(String(question.lesson)) ?? {},
      author: names.get(String(question.author)) ?? 'Learner',
      body: question.body,
      answers: question.answers.length,
      hidden: Boolean(question.hidden),
      createdAt: question.createdAt.toISOString(),
    })),
    surveys: surveys.map((survey) => ({
      id: String(survey._id),
      courseTitle: courseTitles.get(String(survey.course)) ?? {},
      comment: survey.comment,
      hidden: Boolean(survey.hidden),
      createdAt: survey.createdAt.toISOString(),
    })),
  };
}

/** Recompute the public rating from reviews that are still visible. */
async function refreshCourseRating(courseId: Types.ObjectId): Promise<void> {
  const { Review } = await import('./models/review');
  const visible = await Review.find({ course: courseId, hidden: { $ne: true } }).select('rating').lean();
  const count = visible.length;
  const average = count > 0 ? visible.reduce((total, review) => total + review.rating, 0) / count : 0;
  await Course.findByIdAndUpdate(courseId, { ratingAverage: Math.round(average * 10) / 10, ratingCount: count });
}

/** Hide or restore a review; the course rating follows immediately. */
export async function setReviewHidden(reviewId: string, hidden: boolean): Promise<boolean> {
  await connectToDatabase();
  const { Review } = await import('./models/review');
  if (!Types.ObjectId.isValid(reviewId)) return false;
  const review = await Review.findByIdAndUpdate(reviewId, { hidden }, { returnDocument: 'after' }).lean();
  if (!review) return false;
  await refreshCourseRating(review.course);
  return true;
}

/** Hide or restore a lesson question without deleting the thread. */
export async function setQuestionHidden(questionId: string, hidden: boolean): Promise<boolean> {
  await connectToDatabase();
  const { Question } = await import('./models/question');
  if (!Types.ObjectId.isValid(questionId)) return false;
  const result = await Question.updateOne({ _id: questionId }, { hidden });
  return result.matchedCount > 0;
}

/** Bulk review moderation: one update, then one rating refresh per affected course. */
export async function setReviewsHidden(reviewIds: string[], hidden: boolean): Promise<number> {
  await connectToDatabase();
  const { Review } = await import('./models/review');
  const ids = reviewIds.filter((id) => Types.ObjectId.isValid(id)).slice(0, 200);
  if (ids.length === 0) return 0;
  const reviews = await Review.find({ _id: { $in: ids } }).select('course').lean();
  const result = await Review.updateMany({ _id: { $in: ids } }, { hidden });
  const courses = [...new Set(reviews.map((review) => String(review.course)))].filter((id) => Types.ObjectId.isValid(id));
  await Promise.all(courses.map((id) => refreshCourseRating(new Types.ObjectId(id))));
  return result.matchedCount;
}

/** Hide or restore survey comments; hidden rows drop out of the teacher averages. */
export async function setSurveysHidden(surveyIds: string[], hidden: boolean): Promise<number> {
  await connectToDatabase();
  const ids = surveyIds.filter((id) => Types.ObjectId.isValid(id)).slice(0, 200);
  if (ids.length === 0) return 0;
  const result = await CompletionSurvey.updateMany({ _id: { $in: ids } }, { hidden });
  return result.matchedCount;
}

/** Bulk question moderation; questions do not feed any course average. */
export async function setQuestionsHidden(questionIds: string[], hidden: boolean): Promise<number> {
  await connectToDatabase();
  const { Question } = await import('./models/question');
  const ids = questionIds.filter((id) => Types.ObjectId.isValid(id)).slice(0, 200);
  if (ids.length === 0) return 0;
  const result = await Question.updateMany({ _id: { $in: ids } }, { hidden });
  return result.matchedCount;
}

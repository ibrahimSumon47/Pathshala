import { mkdir, writeFile } from 'node:fs/promises';
import {
  Certificate,
  connectToDatabase,
  Course,
  disconnectFromDatabase,
  Enrolment,
  Lesson,
  Order,
  User,
} from '@pathshala/db';

/**
 * Enumerate the routes an audit should visit, per role, from the live data.
 * Reads only: the audit must never create or change a user's rows.
 */
type Route = { path: string; label: string; expectStatus?: number };

const accountEmail = {
  student: 'student@pathshala.dev',
  instructor: 'instructor@pathshala.dev',
  admin: 'admin@pathshala.dev',
};
const locales = ['en', 'bn'] as const;
/** Every locale for the pages people reach first; the rest are covered in English. */
const bothLocaleLabels = new Set(['landing', 'catalogue', 'course', 'dashboard', 'studio', 'sign-in', 'refund-policy']);

/** Add one route per locale, but only the primary locales read the same page twice. */
function add(list: Route[], path: string, label: string): void {
  const values = bothLocaleLabels.has(label) ? locales : (['en'] as const);
  for (const locale of values) list.push({ path: `/${locale}${path}`, label: `${label}-${locale}` });
}

async function main(): Promise<void> {
  await connectToDatabase();
  const publicRoutes: Route[] = [];
  const studentRoutes: Route[] = [];
  const instructorRoutes: Route[] = [];
  const adminRoutes: Route[] = [];
  const states: Route[] = [];

  const courses = await Course.find({ status: 'published' }).sort({ publishedAt: -1 }).limit(4).lean();
  const featured = courses[0];
  const previewCourse = await Course.findOne({ status: 'published', previewImageUrls: { $exists: true, $ne: [] } }).lean();
  const previewLesson = previewCourse ? await Lesson.findOne({ course: previewCourse._id, isPreview: true }).lean() : null;
  const certificate = await Certificate.findOne().lean();
  const instructor = await User.findOne({ email: accountEmail.instructor }).lean();
  const student = await User.findOne({ email: accountEmail.student }).lean();
  const admin = await User.findOne({ email: accountEmail.admin }).lean();
  const studioCourse = instructor ? await Course.findOne({ instructor: instructor._id }).sort({ updatedAt: -1 }).lean() : null;
  const quizLesson = studioCourse ? await Lesson.findOne({ course: studioCourse._id, type: 'quiz' }).lean() : null;

  add(publicRoutes, '', 'landing');
  add(publicRoutes, '/courses', 'catalogue');
  add(publicRoutes, '/courses?q=javascript&price=all&sort=newest', 'catalogue-filtered');
  if (featured) add(publicRoutes, `/courses/${featured.slug}`, 'course');
  if (courses[1]) add(publicRoutes, `/courses/${courses[1].slug}`, 'course-second', false);
  if (previewCourse && previewLesson) {
    add(publicRoutes, `/courses/${previewCourse.slug}/preview/${previewLesson._id}`, 'preview-lesson');
  }
  add(publicRoutes, '/refund-policy', 'refund-policy');
  add(publicRoutes, '/sign-in', 'sign-in');
  add(publicRoutes, '/register', 'register');
  if (certificate) add(publicRoutes, `/verify/${certificate.code}`, 'verify', false);
  if (instructor) add(publicRoutes, `/instructors/${instructor._id}`, 'instructor-page', false);

  if (student) {
    add(studentRoutes, '/dashboard', 'dashboard');
    add(studentRoutes, '/dashboard/orders', 'dashboard-orders', false);
    add(studentRoutes, '/dashboard/notifications', 'dashboard-notifications', false);
    add(studentRoutes, '/dashboard/wishlist', 'dashboard-wishlist', false);
    add(studentRoutes, '/dashboard/notes', 'dashboard-notes', false);
    add(studentRoutes, '/dashboard/saved-searches', 'dashboard-saved-searches', false);
    add(studentRoutes, '/dashboard/surveys', 'dashboard-surveys', false);
    add(studentRoutes, '/dashboard/settings', 'dashboard-settings', false);
    add(studentRoutes, '/dashboard/profile', 'dashboard-profile', false);
    add(studentRoutes, '/cart', 'cart', false);

    const enrolments = await Enrolment.find({ student: student._id }).populate('course').lean();
    const enrolledCourse = enrolments
      .map((enrolment) => enrolment.course as unknown as { slug?: string; status?: string })
      .find((course) => course?.slug && course.status === 'published');
    if (enrolledCourse?.slug) add(studentRoutes, `/learn/${enrolledCourse.slug}`, 'learn', false);

    const order = await Order.findOne({ user: student._id }).sort({ createdAt: -1 }).lean();
    if (order) add(studentRoutes, `/checkout/${order.orderNumber}`, 'checkout', false);
  }

  if (studioCourse) {
    add(instructorRoutes, '/studio', 'studio');
    add(instructorRoutes, `/studio/${studioCourse._id}`, 'studio-course', false);
    add(instructorRoutes, `/studio/${studioCourse._id}/roster`, 'studio-roster', false);
    if (quizLesson) {
      add(instructorRoutes, `/studio/${studioCourse._id}/lesson/${quizLesson._id}`, 'studio-quiz', false);
    }
    add(instructorRoutes, '/studio/community', 'studio-community', false);
    add(instructorRoutes, '/studio/earnings', 'studio-earnings', false);
    add(instructorRoutes, '/studio/promotions', 'studio-promotions', false);
    add(instructorRoutes, '/studio/questions', 'studio-questions', false);
  }

  if (admin) {
    add(adminRoutes, '/admin', 'admin');
    add(adminRoutes, '/admin/orders', 'admin-orders', false);
    add(adminRoutes, '/admin/refunds', 'admin-refunds', false);
    add(adminRoutes, '/admin/payouts', 'admin-payouts', false);
    add(adminRoutes, '/admin/certificates', 'admin-certificates', false);
    add(adminRoutes, '/admin/coupons', 'admin-coupons', false);
  }

  // States that need a deliberate input: empty results, a missing page and a form error.
  states.push(
    { path: '/en/courses?q=zzzznothing', label: 'state-empty-search' },
    { path: '/en/courses/no-such-course', label: 'state-not-found', expectStatus: 404 },
    { path: '/en/sign-in?error=CredentialsSignin', label: 'state-sign-in-error' },
    ...(previewCourse ? [{ path: `/en/courses/${previewCourse.slug}`, label: 'state-course-filled' }] : []),
  );

  const plan = {
    generatedAt: new Date().toISOString(),
    public: publicRoutes,
    student: studentRoutes,
    instructor: instructorRoutes,
    admin: adminRoutes,
    states,
  };
  await mkdir('docs/audit', { recursive: true });
  await writeFile('docs/audit/routes.json', `${JSON.stringify(plan, null, 2)}\n`);
  const total = publicRoutes.length + studentRoutes.length + instructorRoutes.length + adminRoutes.length;
  console.log(`audit routes: ${total} role routes, ${states.length} states`);
  // The database handle would otherwise keep the process alive after the file is written.
  await disconnectFromDatabase();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

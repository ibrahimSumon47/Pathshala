import mongoose from 'mongoose';
import {
  Certificate,
  CompletionSurvey,
  Course,
  Enrolment,
  Lesson,
  LiveWaitlist,
  Note,
  Notification,
  Order,
  QuestionBankItem,
  QuizAttempt,
  QuizQuestion,
  Review,
  SavedSearch,
  Section,
  User,
  Wishlist,
  connectToDatabase,
} from '@pathshala/db';

/**
 * The production journeys own an `e2e-` namespace, so their rows can be removed without
 * touching the demo catalogue. Run this after a suite when the seeded screenshots matter.
 */
export async function cleanupE2eData(): Promise<Record<string, number>> {
  await connectToDatabase();
  const users = await User.find({ email: /^e2e-.*@pathshala\.dev$/ }).select('_id').lean();
  const userIds = users.map((user) => user._id);
  const courses = await Course.find({ slug: /^e2e-/ }).select('_id').lean();
  const courseIds = courses.map((course) => course._id);

  const removed: Record<string, number> = {};
  const record = (name: string, result: { deletedCount?: number }) => {
    removed[name] = result.deletedCount ?? 0;
  };

  if (courseIds.length > 0) {
    const lessons = await Lesson.find({ course: { $in: courseIds } }).select('_id').lean();
    const lessonIds = lessons.map((lesson) => lesson._id);
    record('quizQuestions', await QuizQuestion.deleteMany({ lesson: { $in: lessonIds } }));
    record('quizAttempts', await QuizAttempt.deleteMany({ course: { $in: courseIds } }));
    record('completionSurveys', await CompletionSurvey.deleteMany({ course: { $in: courseIds } }));
    record('questionBankItems', await QuestionBankItem.deleteMany({ sourceCourse: { $in: courseIds } }));
    record('liveWaitlists', await LiveWaitlist.deleteMany({ course: { $in: courseIds } }));
    record('notes', await Note.deleteMany({ course: { $in: courseIds } }));
    record('lessons', await Lesson.deleteMany({ course: { $in: courseIds } }));
    record('sections', await Section.deleteMany({ course: { $in: courseIds } }));
    record('courses', await Course.deleteMany({ _id: { $in: courseIds } }));
  }

  if (userIds.length > 0) {
    record('certificates', await Certificate.deleteMany({ student: { $in: userIds } }));
    record('enrolments', await Enrolment.deleteMany({ student: { $in: userIds } }));
    record('orders', await Order.deleteMany({ user: { $in: userIds } }));
    record('reviews', await Review.deleteMany({ student: { $in: userIds } }));
    record('notes', await Note.deleteMany({ student: { $in: userIds } }));
    record('wishlist', await Wishlist.deleteMany({ student: { $in: userIds } }));
    record('quizAttempts', await QuizAttempt.deleteMany({ student: { $in: userIds } }));
    record('completionSurveys', await CompletionSurvey.deleteMany({ student: { $in: userIds } }));
    record('questionBankItems', await QuestionBankItem.deleteMany({ instructor: { $in: userIds } }));
    record('savedSearches', await SavedSearch.deleteMany({ user: { $in: userIds } }));
    record('liveWaitlists', await LiveWaitlist.deleteMany({ student: { $in: userIds } }));
    record('notifications', await Notification.deleteMany({ user: { $in: userIds } }));
    // E2E purchases use the seeded EARLYBIRD code and now create a cap note for its creator.
    record(
      'couponCapNotes',
      await Notification.deleteMany({ 'title.en': 'Coupon use limit reached', 'body.en': /^EARLYBIRD:/ }),
    );
    record('users', await User.deleteMany({ _id: { $in: userIds } }));
  }

  return removed;
}

if (process.argv[1]?.endsWith('cleanup-e2e.ts')) {
  void cleanupE2eData()
    .then(async (removed) => {
      console.log('Removed test rows:', removed);
      await mongoose.disconnect();
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exit(1);
    });
}

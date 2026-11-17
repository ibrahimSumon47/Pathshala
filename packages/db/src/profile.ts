import { Types } from 'mongoose';
import { Certificate } from './models/certificate';
import { Enrolment } from './models/enrolment';
import { Review } from './models/review';
import { User, type UserRole } from './models/user';
import type { CatalogCourse } from './catalog';
import { listInstructorCourses } from './catalog';
import { getInstructorEarnings } from './commerce';
import type { AdminReport } from './admin';
import { getAdminReport } from './admin';
import type { LocalizedText } from './common';
import { connectToDatabase } from './connection';

export type ProfileStats = {
  enrolled: number;
  completed: number;
  certificates: number;
  reviews: number;
};

export type ProfileRole = 'learner' | 'instructor' | 'admin';

/** Teaching numbers only a teacher and an operator may see. */
export type TeachingStats = {
  students: number;
  rating: number | null;
  ratingCount: number;
  earningsPaisa: number;
  sales: number;
};

export type Profile = {
  id: string;
  name: string;
  email: string | null;
  image: string | null;
  roles: UserRole[];
  headline: LocalizedText;
  bio: LocalizedText;
  joinedAt: string;
  role: ProfileRole;
  stats: ProfileStats;
  teaching: TeachingStats;
  report: AdminReport | null;
  taught: CatalogCourse[];
};

export type ProfileInput = {
  name: string;
  headline: string;
  headlineEn: string;
  bio: string;
  bioEn: string;
};

/** Empty prose is stored as undefined so the page can fall back to the other language. */
function prose(value: string | undefined): string | undefined {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Build the bilingual pair from the two columns the profile form edits. */
function localized(bn: string | undefined, en: string | undefined): LocalizedText {
  return {
    ...(bn?.trim() ? { bn: bn.trim() } : {}),
    ...(en?.trim() ? { en: en.trim() } : {}),
  };
}

/** Weighted across the teacher's courses so one busy course does not dominate the average. */
function teachingFrom(courses: CatalogCourse[], earningsPaisa = 0, sales = 0): TeachingStats {
  const rated = courses.filter((course) => course.ratingCount > 0);
  const ratingCount = rated.reduce((total, course) => total + course.ratingCount, 0);
  return {
    students: courses.reduce((total, course) => total + course.enrolmentCount, 0),
    ratingCount,
    rating: ratingCount > 0 ? rated.reduce((total, course) => total + course.ratingAverage * course.ratingCount, 0) / ratingCount : null,
    earningsPaisa,
    sales,
  };
}

/** Learning counts shown beside a learner's own profile. */
async function statsFor(userId: string): Promise<ProfileStats> {
  const [enrolled, completed, certificates, reviews] = await Promise.all([
    Enrolment.countDocuments({ student: userId }),
    Enrolment.countDocuments({ student: userId, status: 'completed' }),
    Certificate.countDocuments({ student: userId }),
    Review.countDocuments({ student: userId }),
  ]);
  return { enrolled, completed, certificates, reviews };
}

/** The signed-in reader's profile, including the private email and their learning counts. */
export async function getProfileForUser(userId: string): Promise<Profile | null> {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(userId)) return null;
  const user = await User.findById(userId).lean();
  if (!user) return null;
  const isAdmin = user.roles.includes('admin');
  const isInstructor = user.roles.includes('instructor');
  const [stats, taught, earnings, report] = await Promise.all([
    statsFor(userId),
    isInstructor ? listInstructorCourses(userId, 12) : Promise.resolve([]),
    isInstructor ? getInstructorEarnings(userId) : Promise.resolve({ totalPaisa: 0, sales: 0 }),
    isAdmin ? getAdminReport() : Promise.resolve(null),
  ]);
  const role: ProfileRole = isAdmin ? 'admin' : isInstructor ? 'instructor' : 'learner';
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    image: user.image ?? null,
    roles: user.roles,
    headline: localized(user.headline, user.headlineEn),
    bio: localized(user.bio, user.bioEn),
    joinedAt: new Date(user.createdAt).toISOString(),
    role,
    stats,
    teaching: teachingFrom(taught, earnings.totalPaisa, earnings.sales),
    report,
    taught,
  };
}

/**
 * A teacher's public profile. Learners and operators are not public: only an instructor
 * has a page, and the email never leaves the database.
 */
export async function getInstructorProfile(instructorId: string): Promise<Profile | null> {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(instructorId)) return null;
  const user = await User.findById(instructorId).lean();
  if (!user) return null;
  if (!user.roles.includes('instructor')) return null;
  const taught = await listInstructorCourses(instructorId, 12);
  const [stats] = await Promise.all([statsFor(instructorId)]);
  return {
    id: String(user._id),
    name: user.name,
    email: null,
    image: user.image ?? null,
    roles: user.roles,
    headline: localized(user.headline, user.headlineEn),
    bio: localized(user.bio, user.bioEn),
    joinedAt: new Date(user.createdAt).toISOString(),
    role: 'instructor',
    stats,
    teaching: teachingFrom(taught),
    report: null,
    taught,
  };
}

/** Save the profile prose a reader owns; name changes still flow through the settings action. */
export async function updateProfileForUser(userId: string, input: ProfileInput): Promise<void> {
  await connectToDatabase();
  await User.updateOne(
    { _id: userId },
    {
      name: input.name.trim(),
      headline: prose(input.headline),
      headlineEn: prose(input.headlineEn),
      bio: prose(input.bio),
      bioEn: prose(input.bioEn),
    },
  );
}

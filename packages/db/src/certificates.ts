import { randomBytes } from 'node:crypto';
import type { Types } from 'mongoose';
import { connectToDatabase } from './connection';
import { Certificate, type CertificateDoc } from './models/certificate';
import { Course } from './models/course';
import { Enrolment } from './models/enrolment';
import { User } from './models/user';

type Doc<T> = T & { _id: Types.ObjectId };

// No I, O, 0 or 1: a code is read aloud or typed from a printed certificate.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Generate a 16-character public code with 80 bits of randomness. */
export function generateCertificateCode(bytes = 16): string {
  const buffer = randomBytes(bytes);
  let code = '';
  for (const byte of buffer) code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  return code;
}

/** The printed number carries the issue year and a short prefix of the public code. */
export function certificateNumberFor(issuedAt: Date, code: string): string {
  return `PS-${issuedAt.getUTCFullYear()}-${code.slice(0, 6)}`;
}

export type CertificateView = {
  code: string;
  number: string;
  studentName: string;
  courseTitle: { bn?: string; en?: string };
  courseSlug: string;
  instructorName: string;
  issuedAt: string;
  revoked: boolean;
};

/** Map a certificate and its joined names to the public certificate shape. */
function toView(
  certificate: Doc<CertificateDoc>,
  studentName: string,
  course: { title: { bn?: string; en?: string }; slug: string },
  instructorName: string,
): CertificateView {
  return {
    code: certificate.code,
    number: certificate.number,
    studentName,
    courseTitle: course.title,
    courseSlug: course.slug,
    instructorName,
    issuedAt: certificate.issuedAt.toISOString(),
    revoked: Boolean(certificate.revokedAt),
  };
}

/**
 * Issue a certificate for a completed enrolment. A learner who finishes a course twice
 * keeps the original certificate; the unique student/course index enforces that.
 */
export async function issueCertificateIfEligible(
  studentId: string,
  courseId: string,
): Promise<CertificateView | null> {
  await connectToDatabase();
  const [enrolment, course] = await Promise.all([
    Enrolment.findOne({ student: studentId, course: courseId }).lean(),
    Course.findById(courseId).select('title slug instructor').lean(),
  ]);
  if (!enrolment || enrolment.status !== 'completed' || !course) return null;

  const existing = await Certificate.findOne({ student: studentId, course: courseId }).lean();
  if (existing) {
    const [student, instructor] = await Promise.all([
      User.findById(studentId).select('name').lean(),
      User.findById(course.instructor).select('name').lean(),
    ]);
    return toView(existing as Doc<CertificateDoc>, student?.name || 'Learner', course, instructor?.name || 'Instructor');
  }

  const issuedAt = new Date();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateCertificateCode();
    try {
      const certificate = await Certificate.create({
        student: studentId,
        course: courseId,
        instructor: course.instructor,
        number: certificateNumberFor(issuedAt, code),
        code,
        issuedAt,
      });
      const [student, instructor] = await Promise.all([
        User.findById(studentId).select('name').lean(),
        User.findById(course.instructor).select('name').lean(),
      ]);
      return toView(
        certificate.toObject() as Doc<CertificateDoc>,
        student?.name || 'Learner',
        course,
        instructor?.name || 'Instructor',
      );
    } catch (error) {
      // A simultaneous completion can win the unique code or the student/course race.
      if (attempt === 4) throw error;
    }
  }
  return null;
}

/** Public lookup by code. A revoked certificate resolves but reports its status honestly. */
export async function getCertificateByCode(code: string): Promise<CertificateView | null> {
  await connectToDatabase();
  const certificate = await Certificate.findOne({ code: code.toUpperCase() }).lean();
  if (!certificate) return null;
  const [student, course, instructor] = await Promise.all([
    User.findById(certificate.student).select('name').lean(),
    Course.findById(certificate.course).select('title slug').lean(),
    User.findById(certificate.instructor).select('name').lean(),
  ]);
  if (!course) return null;
  return toView(
    certificate as Doc<CertificateDoc>,
    student?.name || 'Learner',
    course,
    instructor?.name || 'Instructor',
  );
}

/** Certificates on the dashboard, newest first. */
export async function getStudentCertificates(userId: string): Promise<CertificateView[]> {
  await connectToDatabase();
  const rows = await Certificate.find({ student: userId }).sort({ issuedAt: -1 }).lean();
  if (rows.length === 0) return [];
  const [student, courses, instructors] = await Promise.all([
    User.findById(userId).select('name').lean(),
    Course.find({ _id: { $in: rows.map((row) => row.course) } })
      .select('title slug')
      .lean(),
    User.find({ _id: { $in: rows.map((row) => row.instructor) } })
      .select('name')
      .lean(),
  ]);
  const courseMap = new Map(courses.map((course) => [String(course._id), course]));
  const instructorMap = new Map(instructors.map((instructor) => [String(instructor._id), instructor.name]));
  return rows.flatMap((row) => {
    const course = courseMap.get(String(row.course));
    if (!course) return [];
    return [toView(row as Doc<CertificateDoc>, student?.name || 'Learner', course, instructorMap.get(String(row.instructor)) || 'Instructor')];
  });
}

/** Certificate for one course, used for the dashboard link and the completion action. */
export async function getCertificateForCourse(courseId: string, userId: string): Promise<CertificateView | null> {
  await connectToDatabase();
  const certificate = await Certificate.findOne({ course: courseId, student: userId }).lean();
  if (!certificate) return null;
  return getCertificateByCode(certificate.code);
}

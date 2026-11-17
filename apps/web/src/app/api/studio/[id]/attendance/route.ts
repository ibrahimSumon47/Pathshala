import { getCourseLiveAttendance } from '@pathshala/db';
import { buildCsv } from '@/lib/csv';
import { requireRole } from '@/lib/auth/guard';

export const dynamic = 'force-dynamic';

/** A course's live attendance and waitlist, scoped to its instructor or an admin. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  const user = await requireRole('instructor', 'admin');
  const { id } = await context.params;
  const rows = await getCourseLiveAttendance(id, user.id, user.roles.includes('admin'));
  if (!rows) return new Response('Course not found.', { status: 404 });
  const csv = buildCsv(['session', 'startsAt', 'status', 'learner', 'email', 'position', 'addedAt'], rows);
  return new Response('\uFEFF' + csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="pathshala-live-attendance.csv"',
      'cache-control': 'private, no-store',
    },
  });
}

import { getCourseRoster } from '@pathshala/db';
import { buildCsv } from '@/lib/csv';
import { requireRole } from '@/lib/auth/guard';
import { parseRosterFilters } from '@/lib/roster-filters';

export const dynamic = 'force-dynamic';

/** A course roster with progress, completion and certificate state for its teacher. */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  const user = await requireRole('instructor', 'admin');
  const { id } = await context.params;
  const params = new URL(request.url).searchParams;
  const filters = parseRosterFilters({
    status: params.get('status') ?? undefined,
    from: params.get('from') ?? undefined,
    to: params.get('to') ?? undefined,
  });
  const roster = await getCourseRoster(id, user.id, user.roles.includes('admin'), filters);
  if (!roster) return new Response('Course not found.', { status: 404 });
  const csv = buildCsv(
    ['name', 'email', 'progressPercent', 'status', 'enrolledAt', 'completedAt', 'certificateCode', 'surveySubmitted'],
    roster.students,
  );
  return new Response('\uFEFF' + csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="pathshala-roster.csv"',
      'cache-control': 'private, no-store',
    },
  });
}

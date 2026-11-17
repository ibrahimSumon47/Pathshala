import { getInstructorStatements } from '@pathshala/db';
import { buildCsv } from '@/lib/csv';
import { requireRole } from '@/lib/auth/guard';

export const dynamic = 'force-dynamic';

/** A teacher's own statement export. Only the signed-in teacher's ledger is read. */
export async function GET(): Promise<Response> {
  const user = await requireRole('instructor', 'admin');
  const statements = await getInstructorStatements(user.id);
  const csv = buildCsv(['month', 'sales', 'salesPaisa', 'refunds', 'refundsPaisa', 'netPaisa', 'paidAt'], statements);
  return new Response('\uFEFF' + csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="pathshala-earnings.csv"',
      'cache-control': 'private, no-store',
    },
  });
}

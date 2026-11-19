import { getAuditRowsForExport, recordAuditEvent } from '@pathshala/db';
import { requireRole } from '@/lib/auth/guard';
import { buildCsv } from '@/lib/csv';

export const dynamic = 'force-dynamic';

/** Admin-only audit export. The same action filter as the desk travels into the file. */
export async function GET(request: Request): Promise<Response> {
  const user = await requireRole('admin');
  const action = new URL(request.url).searchParams.get('action')?.trim().slice(0, 80) ?? '';
  const rows = await getAuditRowsForExport(2000, action ? { action } : {});
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const userAgent = request.headers.get('user-agent') ?? '';
  await recordAuditEvent({
    actor: user.id,
    action: 'audit.export',
    entityType: 'audit',
    metadata: { rows: rows.length, ...(action ? { action } : {}) },
    ...(ip ? { ip } : {}),
    ...(userAgent ? { userAgent } : {}),
  });
  const csv = buildCsv(
    ['createdAt', 'actorName', 'action', 'entityType', 'entityId', 'metadata'],
    rows.map((row) => ({ ...row, metadata: JSON.stringify(row.metadata) })),
  );
  return new Response('\uFEFF' + csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="pathshala-audit.csv"',
      'cache-control': 'no-store',
    },
  });
}

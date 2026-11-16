import { getAuditRowsForExport, recordAuditEvent } from '@pathshala/db';
import { requireRole } from '@/lib/auth/guard';
import { buildCsv } from '@/lib/csv';

export const dynamic = 'force-dynamic';

/** Admin-only audit export. Cells are quoted and formula-safe; the read itself is audited. */
export async function GET(request: Request): Promise<Response> {
  const user = await requireRole('admin');
  const rows = await getAuditRowsForExport();
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const userAgent = request.headers.get('user-agent') ?? '';
  await recordAuditEvent({
    actor: user.id,
    action: 'audit.export',
    entityType: 'audit',
    metadata: { rows: rows.length },
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

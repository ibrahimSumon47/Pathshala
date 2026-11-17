import { listNotes } from '@pathshala/db';
import { requireUser } from '@/lib/auth/guard';
import { buildCsv } from '@/lib/csv';

export const dynamic = 'force-dynamic';

/** The signed-in reader's own notes, flattened for a spreadsheet. */
export async function GET(request: Request): Promise<Response> {
  const user = await requireUser();
  const language = new URL(request.url).searchParams.get('locale') === 'en' ? 'en' : 'bn';
  const notes = await listNotes(user.id);
  const csv = buildCsv(
    ['course', 'lesson', 'note', 'updatedAt'],
    notes.map((note) => ({
      course: note.courseTitle[language] ?? note.courseTitle.en ?? note.courseSlug,
      lesson: note.lessonTitle[language] ?? note.lessonTitle.en ?? '',
      note: note.body,
      updatedAt: note.updatedAt,
    })),
  );
  return new Response('\uFEFF' + csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="pathshala-notes.csv"',
      'cache-control': 'private, no-store',
    },
  });
}

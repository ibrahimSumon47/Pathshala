import { getSessionForViewer, jitsiUrl } from '@pathshala/db';
import { requireUser } from '@/lib/auth/guard';
import { buildSessionCalendar } from '@/lib/calendar';

export const dynamic = 'force-dynamic';

type RouteProps = { params: Promise<{ id: string }> };

/** Download one live session as an .ics file; access follows the course enrolment. */
export async function GET(_request: Request, { params }: RouteProps): Promise<Response> {
  const { id } = await params;
  const user = await requireUser();
  const session = await getSessionForViewer(id, user.id, user.roles);
  if (!session) return Response.json({ error: { code: 'not_found', message: 'Session not found.' } }, { status: 404 });

  const start = new Date(session.session.startsAt);
  const end = new Date(start.getTime() + session.session.durationMinutes * 60 * 1000);
  const title = session.session.title.en ?? session.session.title.bn ?? session.courseTitle.en ?? 'Live class';
  const ics = buildSessionCalendar({
    uid: `${session.session.id}@pathshala`,
    start,
    end,
    title,
    description: session.session.description.en ?? session.session.description.bn ?? 'Live class at Pathshala.',
    location: jitsiUrl(session.session.roomName),
    url: jitsiUrl(session.session.roomName),
  });
  return new Response(ics, {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': `attachment; filename="pathshala-${session.session.id}.ics"`,
      'cache-control': 'no-store',
    },
  });
}

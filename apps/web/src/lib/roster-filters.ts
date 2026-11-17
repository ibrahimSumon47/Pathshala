import type { RosterFilters } from '@pathshala/db';

export type RosterFilterQuery = { status?: string | undefined; from?: string | undefined; to?: string | undefined };

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Turn date-only query values into UTC boundaries; `to` includes its whole day. */
function day(value: string | undefined, endOfDay: boolean): Date | undefined {
  if (!value || !DAY.test(value)) return undefined;
  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Accept only the roster filters the database understands, ignoring junk in the URL. */
export function parseRosterFilters(query: RosterFilterQuery): RosterFilters {
  const status = query.status === 'active' || query.status === 'completed' ? query.status : undefined;
  const from = day(query.from, false);
  const to = day(query.to, true);
  return {
    ...(status ? { status } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  };
}

/** Keep the export URL in step with the filters currently shown on the roster. */
export function rosterQueryString(filters: RosterFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.from) params.set('from', filters.from.toISOString().slice(0, 10));
  if (filters.to) params.set('to', filters.to.toISOString().slice(0, 10));
  return params.toString();
}

import { describe, expect, it } from 'vitest';
import { buildSessionCalendar } from './calendar';

describe('buildSessionCalendar', () => {
  const event = {
    uid: 'session-1@pathshala',
    start: new Date('2026-11-17T10:00:00Z'),
    end: new Date('2026-11-17T11:00:00Z'),
    title: 'Grammar, practice; questions',
    description: 'Bring a notebook\nand a question',
    location: 'https://meet.jit.si/pathshala-demo',
    url: 'https://pathshala.example/live/session-1',
    now: new Date('2026-11-16T12:00:00Z'),
  };

  it('writes one CRLF calendar with a stable UID and UTC times', () => {
    const ics = buildSessionCalendar(event);
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('UID:session-1@pathshala');
    expect(ics).toContain('DTSTART:20261117T100000Z');
    expect(ics).toContain('DTEND:20261117T110000Z');
  });

  it('escapes commas, semicolons, backslashes and newlines', () => {
    const ics = buildSessionCalendar(event);
    expect(ics).toContain('SUMMARY:Grammar\\, practice\\; questions');
    expect(ics).toContain('DESCRIPTION:Bring a notebook\\nand a question');
  });

  it('produces the same UID on repeated downloads', () => {
    expect(buildSessionCalendar(event)).toBe(buildSessionCalendar(event));
  });
});

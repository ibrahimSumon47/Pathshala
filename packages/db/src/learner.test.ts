import { describe, expect, it } from 'vitest';
import { dayKey, earnedBadges, streakFromDays } from './learner';

describe('dayKey', () => {
  it('uses the UTC calendar day so a streak does not depend on the server time zone', () => {
    expect(dayKey(new Date('2026-11-17T23:59:59Z'))).toBe('2026-11-17');
    expect(dayKey(new Date('2026-11-18T00:00:01Z'))).toBe('2026-11-18');
  });
});

describe('streakFromDays', () => {
  const today = new Date('2026-11-17T09:00:00Z');

  it('counts consecutive days including today', () => {
    expect(streakFromDays(['2026-11-17', '2026-11-16', '2026-11-15'], today)).toBe(3);
  });

  it('still counts a streak that ended yesterday', () => {
    expect(streakFromDays(['2026-11-16', '2026-11-15'], today)).toBe(2);
  });

  it('ignores duplicate days and a gap in the middle', () => {
    expect(streakFromDays(['2026-11-17', '2026-11-17', '2026-11-15'], today)).toBe(1);
  });

  it('is zero when the last study day was two days ago', () => {
    expect(streakFromDays(['2026-11-14'], today)).toBe(0);
  });

  it('survives a month boundary', () => {
    expect(streakFromDays(['2026-11-01', '2026-10-31', '2026-10-30'], new Date('2026-11-01T00:00:00Z'))).toBe(3);
  });
});

describe('earnedBadges', () => {
  it('marks a badge earned at its target and reports partial progress otherwise', () => {
    const badges = earnedBadges({ lessonsCompleted: 5, coursesCompleted: 0, streak: 2, reviewsWritten: 1 });
    const byKey = new Map(badges.map((badge) => [badge.key, badge]));
    expect(byKey.get('first_lesson')?.earned).toBe(true);
    expect(byKey.get('five_lessons')?.earned).toBe(true);
    expect(byKey.get('twenty_lessons')?.earned).toBe(false);
    expect(byKey.get('twenty_lessons')?.progress).toBeCloseTo(0.25);
    expect(byKey.get('streak_3')?.progress).toBeCloseTo(2 / 3);
    expect(byKey.get('reviewer')?.earned).toBe(true);
    expect(byKey.get('first_course')?.earned).toBe(false);
  });
});

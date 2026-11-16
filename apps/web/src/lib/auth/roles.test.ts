import { describe, expect, it } from 'vitest';
import { hasAnyRole } from './roles';

describe('hasAnyRole', () => {
  it('accepts a matching role', () => {
    expect(hasAnyRole(['instructor'], ['instructor', 'admin'])).toBe(true);
  });

  it('accepts an admin where any staff role is allowed', () => {
    expect(hasAnyRole(['student', 'admin'], ['admin'])).toBe(true);
  });

  it('rejects a student from staff-only routes', () => {
    expect(hasAnyRole(['student'], ['instructor', 'admin'])).toBe(false);
  });

  it('rejects an empty role list', () => {
    expect(hasAnyRole([], ['student'])).toBe(false);
  });
});

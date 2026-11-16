import type { UserRole } from '@pathshala/db';

/** True when the user holds at least one of the roles a page or action requires. */
export function hasAnyRole(held: readonly UserRole[], allowed: readonly UserRole[]): boolean {
  return allowed.some((role) => held.includes(role));
}

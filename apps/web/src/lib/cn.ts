/** Join class names, dropping falsy values so conditional styles stay readable. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

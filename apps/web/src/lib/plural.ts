/**
 * Pick the singular form for exactly one item. English needs two forms; Bangla does not,
 * so callers pass the same measure word twice there.
 */
export function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}
